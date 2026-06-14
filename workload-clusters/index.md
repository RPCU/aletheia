# Workload Clusters

User-facing Kubernetes clusters provisioned by the management cluster via Cluster API. Workers always run on OpenStack VMs (CAPO), but the control plane offers two options.

## Control plane options

| ClusterClass        | Control plane       | Where it runs                        | When to use                              |
| ------------------- | ------------------- | ------------------------------------ | ---------------------------------------- |
| `openstack-default` | KubeadmControlPlane | Dedicated OpenStack VMs (3 CP nodes) | Full VM isolation, traditional HA        |
| `openstack-kamaji`  | KamajiControlPlane  | Pods in the management cluster       | Resource-efficient, high cluster density |

### Kamaji

**Kamaji** runs the tenant Kubernetes control plane (API server, controller manager, scheduler) as pods inside the management cluster, with etcd stored in a Kamaji-managed datastore. This eliminates the need for dedicated control-plane VMs: no VM boot cycle, no cloud-init, no CP flavor costs. More clusters can be hosted on the same infrastructure because the overhead per cluster is just a few pods, not three VMs. Workers are still provisioned on OpenStack via CAPO, identical to the `openstack-default` class.

The trade-off is that the control plane shares the management cluster's fate — a management cluster outage affects all Kamaji-hosted tenant control planes. For clusters that need full VM isolation of the control plane, `openstack-default` is the better choice.

## Multitenancy and isolation

Each workload cluster gets a fully independent Kubernetes control plane — separate etcd, API server, RBAC, and network policy. On top of that, OpenStack adds a second layer of isolation:

- **Project isolation** — each cluster can be placed in its own OpenStack project, with independent quotas, users, and resource boundaries.
- **Network isolation** — Neutron networks, security groups, and routers are scoped per-project, so traffic between clusters is separated at the virtual network layer even before Kubernetes network policies apply.

The combination gives strong multitenancy: Kubernetes RBAC controls who can do what inside a cluster, while OpenStack project and network isolation controls what infrastructure resources a cluster can reach.
