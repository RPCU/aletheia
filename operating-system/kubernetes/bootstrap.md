# Kubernetes Bootstrap Procedure (OpenStack Cluster)

How to bootstrap the Kubernetes cluster on the **baremetal OpenStack nodes** using `kubeadm`. This is specifically for the production OpenStack control plane running on lucy, makise, quinn.

::: tip Canonical procedure
The step-by-step `kubeadm` commands (`initKubeadm` / `joinCPKubeadm`) live in the end-to-end guide so the whole flow stays in one place:

**→ [OpenStack Cluster Bootstrap — Step 4: Bootstrap Kubernetes (kubeadm)](../../bootstrap/openstack-cluster.md#step-4-bootstrap-kubernetes-kubeadm)**

This page only covers the surrounding context. For the CAPI-managed management cluster, see [Management Cluster Bootstrap](../../bootstrap/management-cluster.md).
:::

## Prerequisites

- NixOS installed on all three nodes (lucy, makise, quinn) — see [OpenStack Cluster Bootstrap Guide](../../bootstrap/openstack-cluster.md#step-2-install-nixos-on-all-nodes)
- SSH access to the `lucy` node (the designated bootstrap node)
- Root privileges (`sudo`)

## Procedure summary

1. **Initialize the first control plane (lucy)** with `sudo initKubeadm` — deploys kube-vip (VIP `10.0.0.5`), runs `kubeadm init` against the NixOS-generated config at `/etc/kubernetes/kubeadm/bootstrap.yaml`, sets up `kubectl`, and outputs the join command.
2. **Join makise and quinn** with `sudo joinCPKubeadm <TOKEN> <CERT_KEY>`.
3. **Verify** with `kubectl get nodes` — all three should report `Ready` / `control-plane`.

See [Step 4 of the OpenStack Cluster Bootstrap](../../bootstrap/openstack-cluster.md#step-4-bootstrap-kubernetes-kubeadm) for the exact commands and expected output.

## What's Next

After kubeadm bootstrap, install Cilium (CNI) and Flux (GitOps) — see [OpenStack Cluster Bootstrap → Step 5](../../bootstrap/openstack-cluster.md#step-5-install-cilium-cni).
