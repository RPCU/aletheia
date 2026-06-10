# Kubernetes Bootstrap Procedure (OpenStack Cluster)

How to bootstrap the Kubernetes cluster on the **baremetal OpenStack nodes** using `kubeadm`. This is specifically for the production OpenStack control plane running on lucy, makise, quinn.

::: tip
For the full end-to-end workflow (OS install → kubeadm → Cilium → Flux), see the [OpenStack Cluster Bootstrap Guide](../../bootstrap/openstack-cluster.md#step-4-bootstrap-kubernetes-kubeadm).

For the CAPI-managed management cluster, see [Management Cluster Bootstrap](../../bootstrap/management-cluster.md).
:::

## Prerequisites

- NixOS installed on all three nodes (lucy, makise, quinn) — see [OpenStack Cluster Bootstrap Guide](../../bootstrap/openstack-cluster.md#step-2-install-nixos-on-all-nodes)
- SSH access to the `lucy` node (the designated bootstrap node)
- Root privileges (`sudo`)

## Bootstrap First Node (Lucy)

```bash
ssh user@lucy
sudo initKubeadm
```

The `initKubeadm` script:

1. Deploys kube-vip static pods (VIP `10.0.0.5`)
2. Runs `kubeadm init` with the pre-generated config at `/etc/kubernetes/kubeadm/bootstrap.yaml`
3. Sets up `kubectl` for root and the calling user
4. Outputs the join command for other control plane nodes

## Join Remaining Nodes

Run the output join command on makise and quinn:

```bash
# On makise
sudo joinCPKubeadm <TOKEN> <CERT_KEY>

# On quinn
sudo joinCPKubeadm <TOKEN> <CERT_KEY>
```

## Verify

```bash
kubectl get nodes
# NAME     STATUS   ROLES           AGE   VERSION
# lucy     Ready    control-plane   ...   v1.35.4
# makise   Ready    control-plane   ...   v1.35.4
# quinn    Ready    control-plane   ...   v1.35.4
```

## What's Next

After kubeadm bootstrap, install Cilium (CNI) and Flux (GitOps) — see [OpenStack Cluster Bootstrap](../../bootstrap/openstack-cluster.md#step-5-install-cilium-cni).
