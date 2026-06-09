# Management Cluster

The management cluster (`clusters/mgmt/`) is the CAPI management cluster that runs the Cluster API providers managing itself and other clusters.

## Purpose

- Hosts Cluster API operators and providers (core, kubeadm, CAPO)
- Manages the lifecycle of OpenStack-backed Kubernetes clusters via ClusterClass
- Runs infrastructure services: OCCM (LoadBalancer via Octavia), Cinder CSI, ExternalDNS
- Self-managing target: after `clusterctl move`, the mgmt cluster reconciles itself via GitOps

## Bootstrap

The mgmt cluster is bootstrapped manually using kind + `clusterctl`, then pivoted to run on OpenStack VMs managed by CAPO. See [Cluster API Pivot](./capi-pivot.md) for the full workflow.

After bootstrap, Flux takes over and reconciles everything from the `clusters/mgmt/` path in the Argus repository.

## Flux Deployment

```bash
# 1. Install Cilium (CNI required before Flux can schedule)
helm upgrade --install cilium cilium/cilium -n kube-system \
  -f ./infrastructure/cilium/values.yaml --version 1.18.6

# 2. Install Flux Operator
kustomize build infrastructure/fluxcd/operator/ | kubectl apply -f -
kubectl wait --for=condition=Available deployment/flux-operator -n flux-system --timeout=180s

# 3. Apply Flux Instance (syncs from ./clusters/mgmt)
kustomize build clusters/mgmt/fluxcd/ | kubectl apply -f -
kubectl wait --for=condition=Ready fluxinstance/flux -n flux-system --timeout=180s
```

## Component Stack

The mgmt cluster runs the following components, reconciled by Flux in dependency order:

```
flux-operator
└─> fluxcd (Flux 2.x, syncs ./clusters/mgmt)
    ├─> cilium (eBPF CNI, LoadBalancer DISABLED — OCCM replaces it)
    ├─> cert-manager (prerequisite for CAPI operator)
    │   └─> cert-manager-issuer (root-mgmt CA, *.mgmt.rpcu.lan wildcard)
    ├─> gateway-api (CRDs)
    │   └─> kgateway-crds
    │       └─> kgateway (patched for mgmt: *.mgmt.rpcu.lan, root-mgmt issuer)
    ├─> external-secrets (sources CAPO credentials)
    ├─> cluster-api-operator (depends on cert-manager)
    ├─> orc (OpenStack Resource Controller, CAPO image dependency)
    ├─> cluster-api-providers (depends on operator + ESO + ORC)
    │   ├─> CoreProvider (cluster-api v1.13.2)
    │   ├─> BootstrapProvider (kubeadm v1.13.2)
    │   ├─> ControlPlaneProvider (kubeadm v1.13.2)
    │   ├─> InfrastructureProvider (CAPO v0.14.4)
    │   └─> clusterctl-providers (v1alpha3 inventory CRs for clusterctl move)
    ├─> cluster-api-templates (ClusterClass openstack-default + versioned templates)
    ├─> capo-identity (ESO: capo-variables → mgmt-cloud-config)
    ├─> openstack-ccm-identity (ESO: capo-variables → kube-system/cloud-config)
    ├─> openstack-ccm (OCCM via Octavia, replaces Cilium LB)
    ├─> external-snapshotter-crds (VolumeSnapshot CRDs)
    ├─> external-snapshotter (snapshot-controller)
    ├─> openstack-cinder-csi (dynamic Cinder volumes)
    └─> external-dns (Designate provider, syncs DNS records)
```

## Key Differences from OpenStack Cluster

The OpenStack cluster is **not managed by CAPI** — it runs on baremetal nodes (lucy, makise, quinn) bootstrapped with kubeadm and kube-vip. Only the mgmt cluster runs on CAPI-provisioned OpenStack VMs.

| Aspect              | mgmt (CAPO-managed VMs)              | openstack (baremetal)                  |
| ------------------- | ------------------------------------ | -------------------------------------- |
| **Infrastructure**  | OpenStack VMs via CAPO               | Baremetal (Hetzner dedicated servers)  |
| **LoadBalancer**    | OpenStack CCM via Octavia            | Cilium L2 announcements                |
| **DNS**             | `*.mgmt.rpcu.lan`                    | `*.rpcu.vpn`                           |
| **Root CA**         | `root-mgmt` (independent)            | `root-rpcu`                            |
| **Cilium socketLB** | `hostNamespaceOnly: false` (default) | `hostNamespaceOnly: true` (nested VMs) |
| **CAPI**            | Self-managing (runs CAPI providers)  | Not involved                           |

## Cilium Configuration

The mgmt cluster uses Cilium as its CNI but **disables its LoadBalancer implementation**:

```yaml
# clusters/mgmt/cilium.yaml (simplified)
l2announcements:
  enabled: false
# CiliumLoadBalancerIPPool and CiliumL2AnnouncementPolicy are $patch: delete'd
```

`Service` type `LoadBalancer` is provided by the OpenStack Cloud Controller Manager (OCCM) via Octavia instead. This is because the mgmt cluster runs as OpenStack VMs with Octavia available.

## OpenStack Credentials

CAPO and OCCM need OpenStack credentials. The flow:

```
capo-variables (manually placed secret in capo-system)
├─> capo-identity (ESO) → mgmt/mgmt-cloud-config (for CAPO identityRef)
└─> openstack-ccm-identity (ESO) → kube-system/cloud-config (for OCCM)
```

The `capo-variables` secret must be created manually — see [Cluster API Providers](https://github.com/RPCU/argus/blob/main/infrastructure/cluster-api-providers/README.md) for the exact secret format.

## Self-Management

After the initial `clusterctl move` pivot, the mgmt cluster becomes self-managing:

1. Flux watches the `clusters/mgmt/` path in the Argus repository
2. CAPI provider CRs are reconciled by the Cluster API Operator
3. The `clusterctl-providers.yaml` file provides v1alpha3 inventory CRs that enable `clusterctl move` to work
4. The ClusterClass and templates are in Git, ready to provision new clusters

Any changes to CAPI providers, templates, or infrastructure components are applied via Git commits — no manual `clusterctl` operations needed after the initial pivot.
