# OpenStack Cluster

The OpenStack cluster (`clusters/openstack/`) is the production cluster running the full OpenStack control plane via Yaook operators on baremetal nodes.

::: info
This cluster is **not managed by Cluster API**. It runs on baremetal nodes (lucy, makise, quinn) bootstrapped with kubeadm. See [OpenStack Cluster Bootstrap](../../bootstrap/openstack-cluster.md) for the initial setup.
:::

## Purpose

- Hosts the OpenStack deployment (Keystone, Glance, Nova, Neutron, Cinder, Octavia, Designate, Barbican, Horizon)
- Runs on baremetal nodes with kube-vip HA (VIP `10.0.0.5`)
- Uses Rook/Ceph for storage, Cilium for networking, kgateway for API gateway

## Architecture

| Component        | Details                                                              |
| ---------------- | -------------------------------------------------------------------- |
| **Kubernetes**   | v1.35.4, kubeadm, kube-vip HA                                        |
| **Nodes**        | lucy (10.0.0.2), makise (10.0.0.3), quinn (10.0.0.4)                 |
| **CNI**          | Cilium v1.18.6 (L2 LoadBalancer, `socketLB.hostNamespaceOnly: true`) |
| **Storage**      | Rook/Ceph v19.2.3 (3 monitors, NVMe SSDs, RBD + S3)                  |
| **Gateway**      | kgateway v2.2.2 (`*.rpcu.vpn`)                                       |
| **DNS Domain**   | `openstack.local`                                                    |
| **Cluster Name** | `openstack`                                                          |

For Kubernetes architecture details, see [Kubernetes Architecture](../../operating-system/kubernetes/architecture.md).

## Component Stack

Flux reconciles the following from `clusters/openstack/`:

```
flux-operator → fluxcd (Flux 2.x)
├─> cilium (eBPF CNI, L2 LoadBalancer)
├─> cert-manager → cert-manager-issuer (root-rpcu CA, *.rpcu.vpn)
├─> trust-manager (distributes RPCU root CA)
├─> gateway-api → kgateway-crds → kgateway (Gateway *.rpcu.vpn)
├─> crossplane (universal control plane)
├─> external-secrets
├─> rook (Ceph storage: 3 monitors, RBD, S3-compatible object store)
└─> yaook-operator (CRDs first, then individual operators)
    └─> yaook (OpenStack service deployments)
        ├─> Keystone, Glance, Nova, Neutron, Cinder
        ├─> Horizon, Octavia, Designate, Barbican
        └─> Gateway API routes per service (*.rpcu.vpn)
```

## Networking

### Cilium

- **LoadBalancer IPs**: `10.0.0.240-10.0.0.253`
- **L2 Interface**: `eno1.4000` (Hetzner vSwitch VLAN)
- **socketLB.hostNamespaceOnly**: `true` — prevents interference with nested KVM/QEMU VMs

### Gateway API

Services are exposed via kgateway with TLS termination:

| Service        | Hostname             | Backend                |
| -------------- | -------------------- | ---------------------- |
| Keystone       | `keystone.rpcu.vpn`  | `keystone-api:5000`    |
| Glance         | `glance.rpcu.vpn`    | `glance-api:9292`      |
| Nova           | `nova.rpcu.vpn`      | `nova-api:8774`        |
| Neutron        | `neutron.rpcu.vpn`   | `neutron-server:9696`  |
| Cinder         | `cinder.rpcu.vpn`    | `cinder-api:8776`      |
| Horizon        | `horizon.rpcu.vpn`   | `horizon-dashboard:80` |
| Octavia        | `octavia.rpcu.vpn`   | `octavia-api:9875`     |
| Designate      | `designate.rpcu.vpn` | `designate-api:9001`   |
| Barbican       | `barbican.rpcu.vpn`  | `barbican-api:9311`    |
| Ceph Dashboard | `ceph.rpcu.vpn`      | (Rook gateway route)   |

## Storage

### Rook/Ceph

- **Monitors**: 3 (lucy, makise, quinn)
- **Storage**: NVMe SSDs
- **Pools**: RBD (block), Object Store (S3)
- **Dashboard**: Enabled

### OpenStack Storage

- **Cinder**: Block storage backed by Ceph RBD
- **Glance**: Image storage backed by Ceph RBD

## OpenStack Services

| Operator                            | Purpose                   |
| ----------------------------------- | ------------------------- |
| `yaook-infra-operator`              | Infrastructure management |
| `yaook-keystone-operator`           | Identity service          |
| `yaook-keystone-resources-operator` | Identity resources        |
| `yaook-glance-operator`             | Image service             |
| `yaook-nova-operator`               | Compute service           |
| `yaook-nova-compute-operator`       | Compute nodes             |
| `yaook-neutron-operator`            | Networking service        |
| `yaook-neutron-ovn-operator`        | OVN networking backend    |
| `yaook-horizon-operator`            | Dashboard                 |
| `yaook-octavia-operator`            | Load balancing            |
| `yaook-designate-operator`          | DNS                       |
| `yaook-cds-operator`                | CDS                       |
| `yaook-barbican-operator`           | Key manager               |

## Credentials

OpenStack credentials flow via External Secrets Operator:

```
keystone-admin (yaook namespace, created by Yaook operators)
├─> crossplane-openstack (ESO) → Crossplane credentials
└─> rook-ceph (ESO) → cinder + glance client keys
```
