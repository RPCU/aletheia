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

## Component Stack

Flux reconciles the following from `clusters/mgmt/`:

```
flux-operator → fluxcd (Flux 2.x)
├─> cilium (eBPF CNI, LoadBalancer DISABLED — OCCM replaces it)
├─> cert-manager → cert-manager-issuer (root-mgmt CA, *.mgmt.rpcu.lan)
├─> gateway-api → kgateway-crds → kgateway (*.mgmt.rpcu.lan)
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

## Hardcoded OpenStack IDs

OpenStack resource IDs are generated at cluster creation time and cannot be changed after the fact. These UUIDs are baked into the configuration and must be kept in sync across multiple files.

| UUID                                   | What It Is                | Files                                                                                                                                 |
| -------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `1cfd69da-057c-4748-a0d4-de5b0ca77db2` | External/Floating Network | `clusters/mgmt/clusters/mgmt.yaml`, `infrastructure/openstack-ccm-identity/externalsecret.yaml`, `clusters/mgmt/apps/chihiro/cm.yaml` |
| `b3ab713d-912b-49ed-adaf-bd74368e567a` | Ceph RBD Secret UUID      | `infrastructure/yaook/nova.yaml`, `infrastructure/yaook/cinder.yaml`                                                                  |
| `2deeb13d-88e2-4f3a-adc8-173b9af365e7` | Default Security Group    | `infrastructure/crossplane-resources/openstack/securityGroups.yaml`                                                                   |
| `bae33843e66e4028b574e36cd0953fac`     | Admin Project             | `infrastructure/crossplane-resources/openstack/project-admin.yaml`                                                                    |

**To find the external network UUID**: `openstack network list --external` on the OpenStack cluster.

See the [Bootstrap Guide](../../bootstrap/openstack/kubernetes.md#hardcoded-openstack-ids) for detailed descriptions of each ID.

## Self-Management

After the initial `clusterctl move` pivot, the mgmt cluster becomes self-managing:

1. Flux watches the `clusters/mgmt/` path in the Argus repository
2. CAPI provider CRs are reconciled by the Cluster API Operator
3. The `clusterctl-providers.yaml` file provides v1alpha3 inventory CRs that enable `clusterctl move` to work
4. The ClusterClass and templates are in Git, ready to provision new clusters

Any changes to CAPI providers, templates, or infrastructure components are applied via Git commits — no manual `clusterctl` operations needed after the initial pivot.
