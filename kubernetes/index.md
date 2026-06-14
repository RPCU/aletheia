# Kubernetes

RPCU runs three types of Kubernetes clusters, each with a distinct role.

## OpenStack Cluster (baremetal)

The foundation — a baremetal cluster (lucy, makise, quinn) that hosts the entire OpenStack control plane. Bootstrapped with kubeadm, kube-vip HA (VIP `10.0.0.5`), Cilium CNI. Not for user workloads.

- [Architecture](../operating-system/kubernetes/architecture.md)
- [Bootstrap Procedure](../operating-system/kubernetes/bootstrap.md)
- [Adding a Node](../openstack/adding-a-node.md)
- [GitOps](../gitops/fluxcd/openstack-cluster.md)

## Management Cluster (CAPI)

Self-managing CAPI cluster on OpenStack VMs (CAPO-provisioned). Hosts the Cluster API providers that manage itself and provision new clusters. Cannot bootstrap itself — requires a temporary kind cluster + `clusterctl move` pivot.

- [Overview](../gitops/fluxcd/management-cluster.md)
- [Bootstrap](../bootstrap/management-cluster.md)
- [CAPI Pivot](../gitops/fluxcd/capi-pivot.md)
