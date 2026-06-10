# Management Cluster Bootstrap

Bootstrap the **CAPI management cluster** — runs on OpenStack VMs provisioned by CAPO, self-manages via GitOps after pivot.

::: info
This cluster **cannot manage itself from nothing** — it requires a temporary kind cluster for initial bootstrap, then a pivot to OpenStack VMs. The OpenStack cluster (baremetal) must already be running to provide the VM infrastructure.

For the baremetal OpenStack cluster bootstrap, see [OpenStack Cluster Bootstrap](./openstack-cluster.md).
:::

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ 1. kind cluster  │───>│ 2. CAPO creates  │───>│ 3. clusterctl    │───>│ 4. Flux + GitOps │
│    (local Docker)│    │    OpenStack VMs  │    │    move (pivot)  │    │    self-managing  │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
     Temporary plane      Target cluster         Transfer resources     Self-managing from Git
```

## Prerequisites

- [OpenStack cluster](./openstack-cluster.md) running and healthy
- Docker installed (for running kind)
- `clusterctl` CLI (v1.12.x)
- `kubectl` configured for the OpenStack cluster
- OpenStack admin credentials (from `keystone-admin` secret on the OpenStack cluster)
- Git repository: [Argus](https://github.com/RPCU/argus)

### Pre-Flight Checklist

Before starting, verify these exist on the **OpenStack cluster**:

- [ ] Glance image `hephaestus-kaas-25.11-v1.35.4` uploaded
- [ ] External network `1cfd69da-057c-4748-a0d4-de5b0ca77db2` exists
- [ ] Flavors `small`, `medium`, `xmedium`, `large`, `xlarge` available

---

## Phase 1: Bootstrap with Kind

A temporary local kind cluster serves as the bootstrap plane for CAPI.

### 1.1 Create a kind cluster

```bash
kind create cluster --name capi-mgmt --wait 5m
```

### 1.2 Initialize Cluster API

```bash
clusterctl init --infrastructure openstack
```

Installs:

| Provider              | Version |
| --------------------- | ------- |
| CAPI core             | v1.13.2 |
| Kubeadm bootstrap     | v1.13.2 |
| Kubeadm control plane | v1.13.2 |
| CAPO (OpenStack)      | v0.14.4 |

### 1.3 Create OpenStack credentials secret

```bash
kubectl --context kind-capi-mgmt -n capo-system create secret generic capo-variables \
  --from-file=clouds.yaml=<path-to-clouds.yaml>
```

::: warning
`auth_url` MUST point to the gateway endpoint (`https://keystone.rpcu.vpn/v3`), not the in-cluster Keystone service. The mgmt cluster is a tenant of the OpenStack cluster.
:::

### 1.4 Apply ClusterClass and templates

```bash
kubectl --context kind-capi-mgmt apply -f infrastructure/cluster-api-templates/
```

Creates: ClusterClass `openstack-default`, KubeadmControlPlaneTemplate, KubeadmConfigTemplate, OpenStackClusterTemplate, OpenStackMachineTemplates.

### 1.5 Create the target mgmt cluster

```bash
kubectl --context kind-capi-mgmt apply -f clusters/mgmt/clusters/mgmt.yaml
```

CAPO provisions OpenStack VMs and kubeadm bootstraps Kubernetes on them.

### 1.6 Wait for the target cluster

```bash
clusterctl get kubeconfig mgmt -n mgmt > /tmp/mgmt.kubeconfig
kubectl --kubeconfig /tmp/mgmt.kubeconfig get nodes
```

Wait until all control-plane nodes are `Ready`.

---

## Phase 2: Pivot (clusterctl move)

Transfer all CAPI resources from the kind cluster to the target mgmt cluster.

### 2.1 Install cert-manager on target

```bash
kubectl --kubeconfig /tmp/mgmt.kubeconfig apply -f \
  https://github.com/cert-manager/cert-manager/releases/download/v1.19.2/cert-manager.yaml
```

### 2.2 Install CAPI operator on target

```bash
helm --kubeconfig /tmp/mgmt.kubeconfig upgrade --install capi-operator \
  kubernetes-sigs.github.io/cluster-api-operator \
  -n capi-operator-system --create-namespace \
  --version 0.27.0 --wait
```

### 2.3 Apply provider CRs on target

```bash
kubectl --kubeconfig /tmp/mgmt.kubeconfig apply -f infrastructure/cluster-api-providers/
```

::: warning
`clusterctl-providers.yaml` provides v1alpha3 Provider inventory CRs that `clusterctl move` needs to discover providers. Without them, the move fails with "provider not found."
:::

### 2.4 Move resources

```bash
clusterctl move --to-kubeconfig /tmp/mgmt.kubeconfig -n mgmt
```

Transfers: Cluster resources, ClusterClass, infrastructure/bootstrap templates.

### 2.5 Verify the move

```bash
kubectl --kubeconfig /tmp/mgmt.kubeconfig get cluster -A
kubectl --kubeconfig /tmp/mgmt.kubeconfig get kubeadmcontrolplane -A
kubectl --kubeconfig /tmp/mgmt.kubeconfig get openstackcluster -A
```

---

## Phase 3: Self-Management via GitOps

### 3.1 Delete the kind cluster

```bash
kind delete cluster --name capi-mgmt
```

### 3.2 Install Cilium

```bash
helm upgrade --install cilium cilium/cilium -n kube-system \
  --kubeconfig /tmp/mgmt.kubeconfig \
  -f ./infrastructure/cilium/values.yaml --version 1.18.6
```

::: info
Cilium's LoadBalancer is **disabled** on the mgmt cluster — OCCM via Octavia provides `Service` type `LoadBalancer` instead.
:::

### 3.3 Install Flux Operator

```bash
kustomize build infrastructure/fluxcd/operator/ | \
  kubectl --kubeconfig /tmp/mgmt.kubeconfig apply -f -
```

### 3.4 Apply Flux Instance

```bash
kustomize build clusters/mgmt/fluxcd/ | \
  kubectl --kubeconfig /tmp/mgmt.kubeconfig apply -f -
```

### 3.5 Create capo-variables secret

```bash
kubectl --kubeconfig /tmp/mgmt.kubeconfig -n capo-system create secret generic capo-variables \
  --from-file=clouds.yaml=<path-to-clouds.yaml>
```

See [Cluster API Providers README](https://github.com/RPCU/argus/blob/main/infrastructure/cluster-api-providers/README.md) for the exact secret format.

### 3.6 Verify Flux reconciliation

```bash
kubectl --kubeconfig /tmp/mgmt.kubeconfig get kustomization -n flux-system
kubectl --kubeconfig /tmp/mgmt.kubeconfig get helmrelease -A
```

All Kustomizations reach `Ready`. The mgmt cluster is now self-managing — CAPI providers reconcile from Git, and the ClusterClass can provision new clusters.

---

## Troubleshooting

### clusterctl move fails with "provider not found"

Ensure `clusterctl-providers.yaml` is applied on the target cluster (step 2.3).

### CAPI providers crash-loop

Check that ORC is installed. CAPO v0.14.x depends on ORC for image resolution:

```bash
kubectl --kubeconfig /tmp/mgmt.kubeconfig get pods -n orc-system
```

### Pod networking fails after pivot

The ClusterClass templates include Cilium security group rules (VXLAN UDP 8472, health TCP 4240, Hubble TCP 4244). Verify:

```bash
openstack security group rule list k8s-cluster-mgmt-mgmt-secgroup-controlplane
```
