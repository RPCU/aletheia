# Kubernetes

The baremetal Kubernetes cluster (`openstack`) is the foundation that the entire OpenStack cloud runs on. It is deployed with `kubeadm` on the lucy, makise, and quinn nodes, with `kube-vip` providing an HA API server VIP (`10.0.0.5`) and Cilium as the CNI.

## Topics

- [Architecture](../operating-system/kubernetes/architecture.md) — nodes, HA VIP, and kubeadm settings.
- [Bootstrap Procedure](../operating-system/kubernetes/bootstrap.md) — bring up the cluster with `kubeadm`.
- [Adding a Node](../openstack/adding-a-node.md) — join a node and label it so the Yaook operators schedule OpenStack agents onto it.

## Related

- [GitOps → OpenStack Cluster](../gitops/fluxcd/openstack-cluster.md) — what Flux reconciles on top of this cluster.
- [OpenStack](../openstack/) — the cloud running on this cluster.
