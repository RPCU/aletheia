# Cluster API Pivot

How the management cluster is bootstrapped using a local kind cluster, then pivoted to run on OpenStack VMs via Cluster API.

## Overview

The management cluster (`clusters/mgmt/`) is the CAPI management cluster. It cannot manage itself from nothing — it needs an initial cluster to run the CAPI controllers. The standard approach is to bootstrap a temporary kind cluster, install CAPI providers on it, create the mgmt cluster on OpenStack VMs, then **pivot** (move) all CAPI resources to the target.

After the pivot, the mgmt cluster becomes self-managing: it runs the same CAPI providers that created it, reconciled by Flux from the Argus repository.

::: note
Only the mgmt cluster is managed by CAPI. The OpenStack cluster (`clusters/openstack/`) runs on baremetal nodes bootstrapped with kubeadm and is not involved in the CAPI pivot.
:::

```
┌──────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Local kind      │     │   OpenStack VMs       │     │   Self-managing     │
│   cluster         │────>│   (CAPO-provisioned)  │────>│   mgmt cluster      │
│                   │     │                       │     │                     │
│  clusterctl init  │     │  clusterctl move      │     │  Flux reconciles    │
│  creates mgmt     │     │  pivots providers     │     │  CAPI providers     │
│  cluster here     │     │  to target            │     │  from Git           │
└──────────────────┘     └──────────────────────┘     └─────────────────────┘
      Phase 1                  Phase 2                       Phase 3
```

## Prerequisites

- Docker (for running kind)
- `clusterctl` CLI (v1.12.x)
- `kubectl` configured for the target OpenStack cluster
- Access to the OpenStack cluster with admin credentials
- The `capo-variables` secret must be created on the target cluster first

## Phase 1: Bootstrap with Kind

### 1. Create a kind cluster

```bash
kind create cluster --name capi-mgmt --wait 5m
```

This creates a local Kubernetes cluster in Docker that will serve as the temporary management plane.

### 2. Initialize Cluster API

```bash
clusterctl init --infrastructure openstack
```

This installs:

- CAPI core provider (v1.13.2)
- Kubeadm bootstrap provider (v1.13.2)
- Kubeadm control plane provider (v1.13.2)
- OpenStack infrastructure provider / CAPO (v0.14.4)

The provider versions are pinned to match the declarative CRs in `infrastructure/cluster-api-providers/`.

### 3. Create the OpenStack credentials secret

CAPO needs OpenStack credentials to provision VMs:

```bash
kubectl --context kind-capi-mgmt -n capo-system create secret generic capo-variables \
  --from-file=clouds.yaml=<path-to-clouds.yaml>
```

### 4. Create the ClusterClass and templates

Apply the reusable templates from the Argus repository:

```bash
kubectl --context kind-capi-mgmt apply -f infrastructure/cluster-api-templates/
```

This creates:

- ClusterClass `openstack-default`
- KubeadmControlPlaneTemplate `openstack-default-control-plane-v1`
- KubeadmConfigTemplate `openstack-default-worker-v1`
- OpenStackClusterTemplate `openstack-default-cluster-v1`
- OpenStackMachineTemplate `openstack-default-{control-plane,worker}-v1`

### 5. Create the target mgmt cluster

Apply the Cluster CR that references the ClusterClass:

```bash
kubectl --context kind-capi-mgmt apply -f clusters/mgmt/clusters/mgmt.yaml
```

CAPO provisions OpenStack VMs, kubeadm bootstraps Kubernetes, and the mgmt cluster comes up with a working control plane.

### 6. Wait for the target cluster to be ready

```bash
clusterctl get kubeconfig mgmt -n mgmt > /tmp/mgmt.kubeconfig
kubectl --kubeconfig /tmp/mgmt.kubeconfig get nodes
```

Wait until all control-plane nodes are `Ready`.

## Phase 2: Pivot (clusterctl move)

### 1. Install CAPI providers on the target cluster

Before moving, the target cluster needs the CAPI operator and providers installed. These will be managed by Flux after the pivot, but they need to exist for `clusterctl move` to work:

```bash
# Install cert-manager (CAPI operator dependency)
kubectl --kubeconfig /tmp/mgmt.kubeconfig apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.19.2/cert-manager.yaml

# Install CAPI operator
helm --kubeconfig /tmp/mgmt.kubeconfig upgrade --install capi-operator \
  kubernetes-sigs.github.io/cluster-api-operator \
  -n capi-operator-system --create-namespace \
  --version 0.27.0 --wait
```

### 2. Apply provider CRs

```bash
kubectl --kubeconfig /tmp/mgmt.kubeconfig apply -f infrastructure/cluster-api-providers/
```

This creates the CAPI provider deployments on the target cluster. The `clusterctl-providers.yaml` file provides the v1alpha3 Provider inventory CRs that `clusterctl move` needs to discover providers on the target.

::: warning
The `clusterctl-providers.yaml` file exists **solely** to make `clusterctl move` work. The Cluster API Operator does not create these v1alpha3 CRs — without them, `clusterctl move` fails with "provider not found."
:::

### 3. Move resources

```bash
clusterctl move --to-kubeconfig /tmp/mgmt.kubeconfig -n mgmt
```

This transfers:

- Cluster resources (Cluster, MachineDeployment, etc.)
- ClusterClass and templates
- Infrastructure templates
- Bootstrap templates

::: note
`clusterctl move` transfers CAPI resources (clusters, machines, templates) but NOT the provider deployments themselves. The providers on the target cluster are already running from step 1-2.
:::

### 4. Verify the move

```bash
kubectl --kubeconfig /tmp/mgmt.kubeconfig get cluster -A
kubectl --kubeconfig /tmp/mgmt.kubeconfig get kubeadmcontrolplane -A
kubectl --kubeconfig /tmp/mgmt.kubeconfig get openstackcluster -A
```

All resources should be present on the target cluster.

## Phase 3: Self-Management via GitOps

### 1. Clean up the kind cluster

Once the pivot is verified, delete the temporary kind cluster:

```bash
kind delete cluster --name capi-mgmt
```

### 2. Install Flux on the mgmt cluster

```bash
# Install Cilium
helm upgrade --install cilium cilium/cilium -n kube-system \
  --kubeconfig /tmp/mgmt.kubeconfig \
  -f ./infrastructure/cilium/values.yaml --version 1.18.6

# Install Flux Operator
kustomize build infrastructure/fluxcd/operator/ | \
  kubectl --kubeconfig /tmp/mgmt.kubeconfig apply -f -

# Apply Flux Instance
kustomize build clusters/mgmt/fluxcd/ | \
  kubectl --kubeconfig /tmp/mgmt.kubeconfig apply -f -
```

### 3. Verify Flux reconciliation

```bash
kubectl --kubeconfig /tmp/mgmt.kubeconfig get kustomization -n flux-system
kubectl --kubeconfig /tmp/mgmt.kubeconfig get helmrelease -A
```

All Kustomizations should eventually reach `Ready` status. The CAPI providers, ClusterClass, and templates are now reconciled from Git.

### 4. Create the capo-variables secret

The mgmt cluster needs the OpenStack credentials secret (not managed by Flux — placed manually):

```bash
kubectl --kubeconfig /tmp/mgmt.kubeconfig -n capo-system create secret generic capo-variables \
  --from-file=clouds.yaml=<path-to-clouds.yaml>
```

See [Cluster API Providers README](https://github.com/RPCU/argus/blob/main/infrastructure/cluster-api-providers/README.md) for details.

## Summary

| Phase       | What runs where             | Purpose                        |
| ----------- | --------------------------- | ------------------------------ |
| **Phase 1** | kind cluster (local Docker) | Temporary bootstrap plane      |
| **Phase 2** | Target OpenStack VMs        | Receive pivoted CAPI resources |
| **Phase 3** | Target OpenStack VMs + Flux | Self-managing via GitOps       |

After Phase 3, the mgmt cluster:

- Runs CAPI providers that manage itself
- Reconciles all configuration from the Argus repository
- Can provision new OpenStack-backed clusters via the ClusterClass
- No manual `clusterctl` operations needed for day-to-day management

## Troubleshooting

### clusterctl move fails with "provider not found"

Ensure `clusterctl-providers.yaml` is applied on the target cluster. This file provides the v1alpha3 Provider inventory CRs that `clusterctl move` uses to discover providers.

### CAPI providers crash-loop on mgmt

Check that ORC (OpenStack Resource Controller) is installed. CAPO v0.14.x depends on ORC for image resolution. ORC is installed as a standalone Flux Kustomization (`clusters/mgmt/orc.yaml`), not as a CAPI provider.

### Pod networking fails after pivot

The ClusterClass templates include explicit Cilium security group rules (VXLAN UDP 8472, health TCP 4240, Hubble TCP 4244). Without these, CAPO's default managed security groups drop Cilium overlay traffic. Verify with:

```bash
openstack security group rule list k8s-cluster-mgmt-mgmt-secgroup-controlplane
```
