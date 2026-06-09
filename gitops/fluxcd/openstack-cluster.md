# OpenStack Cluster

The OpenStack cluster (`clusters/openstack/`) is the primary production cluster running the full OpenStack control plane via Yaook operators. It runs on **baremetal nodes** (lucy, makise, quinn) bootstrapped with kubeadm — it is **not managed by Cluster API**.

## Purpose

- Hosts the OpenStack deployment (Keystone, Glance, Nova, Neutron, Cinder, Octavia, Designate, Barbican, Horizon)
- Runs on baremetal nodes (lucy, makise, quinn) with kube-vip HA
- Uses Rook/Ceph for storage, Cilium for networking, kgateway for API gateway
- Provisioned and managed manually (kubeadm), not via CAPI

## Flux Deployment

```bash
# 1. Install Cilium (CNI)
helm upgrade --install cilium cilium/cilium -n kube-system \
  -f ./infrastructure/cilium/values.yaml --version 1.18.6

# 2. Install Flux Operator
kustomize build infrastructure/fluxcd/operator/ | kubectl apply -f -
kubectl wait --for=condition=Available deployment/flux-operator -n flux-system --timeout=180s

# 3. Apply Flux Instance (syncs from ./clusters/openstack)
kustomize build clusters/openstack/fluxcd/ | kubectl apply -f -
kubectl wait --for=condition=Ready fluxinstance/flux -n flux-system --timeout=180s
```

## Component Stack

```
flux-operator
└─> fluxcd (Flux 2.x, syncs ./clusters/openstack)
    ├─> cilium (eBPF CNI, L2 LoadBalancer, socketLB.hostNamespaceOnly: true)
    ├─> cert-manager
    │   └─> cert-manager-issuer (root-rpcu CA, *.rpcu.vpn wildcard)
    ├─> trust-manager (distributes RPCU root CA)
    ├─> gateway-api (CRDs)
    │   └─> kgateway-crds
    │       └─> kgateway (Gateway *.rpcu.vpn)
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

The OpenStack cluster uses Cilium with L2 announcements for LoadBalancer services:

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

### DNS

Services are synced to OpenStack Designate via ExternalDNS (on the mgmt cluster) and Yaook operators (on this cluster).

## Storage

### Rook/Ceph

- **Cluster**: `rook-ceph`
- **Monitors**: 3 (lucy, makise, quinn)
- **Storage**: NVMe SSDs
- **Version**: Ceph v19.2.3
- **Pools**: RBD (block), Object Store (S3)
- **Dashboard**: Enabled

### OpenStack Storage

- **Cinder**: Block storage backed by Ceph RBD
- **Glance**: Image storage backed by Ceph RBD

## OpenStack Services

The full OpenStack control plane is deployed via Yaook operators:

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

## Kubernetes

- **Version**: v1.35.4
- **HA**: kube-vip with ARP-based VIP at `10.0.0.5:6443`
- **Nodes**: 3 control-plane (lucy, makise, quinn)
- **Pod CIDR**: `10.244.0.0/16`
- **Service CIDR**: `10.96.0.0/20`
- **DNS Domain**: `openstack.local`
- **Cluster Name**: `openstack`
