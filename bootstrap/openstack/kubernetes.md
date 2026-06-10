# Cluster Bootstrap Guide

End-to-end bootstrap for RPCU infrastructure — two distinct paths depending on the cluster.

::: tip
There are **two bootstrap paths**:

| Cluster        | Path                                           | Infra                     | Orchestrator                 |
| -------------- | ---------------------------------------------- | ------------------------- | ---------------------------- |
| **OpenStack**  | [Baremetal Bootstrap](../openstack-cluster.md) | Hetzner dedicated servers | kubeadm (manual)             |
| **Management** | [CAPI Bootstrap](../management-cluster.md)     | OpenStack VMs via CAPO    | kind → pivot → self-managing |

**Start here:** If the baremetal OpenStack cluster is not running yet, begin with the [OpenStack Cluster Bootstrap](../openstack-cluster.md). The management cluster depends on it.
:::

---

## Bootstrap Paths

### OpenStack Cluster (baremetal)

The production OpenStack control plane running on three dedicated servers.

```
Build ISO → Install NixOS → kubeadm init → Cilium → Flux → Yaook/OpenStack
```

[Full guide →](../openstack-cluster.md)

- Nodes: lucy, makise, quinn (baremetal)
- VIP: `10.0.0.5` via kube-vip
- CNI: Cilium (L2 LoadBalancer, `socketLB.hostNamespaceOnly: true`)
- No CAPI involvement

### Management Cluster (CAPI)

The CAPI management cluster that provisions new OpenStack-backed clusters.

```
kind cluster → CAPO provisions VMs → clusterctl move → Flux self-managing
```

[Full guide →](../management-cluster.md)

- Runs on OpenStack VMs provisioned by CAPO
- Self-managing after pivot (reconciles CAPI providers from Git)
- LoadBalancer via OCCM/Octavia (not Cilium)

---

## Manual Secrets

### `capo-variables` (root secret)

The single manually-managed secret. All other secrets derive from it via External Secrets Operator.

**Namespace**: `capo-system` (on mgmt cluster)
**Type**: `Opaque` with key `clouds.yaml`
**Created by**: Manual `kubectl apply` (NOT in Git, NOT managed by Flux)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: capo-variables
  namespace: capo-system
type: Opaque
stringData:
  clouds.yaml: |
    clouds:
      openstack:
        auth:
          auth_url: https://keystone.rpcu.vpn/v3   # MUST be gateway endpoint
          username: "<OS_USERNAME>"
          password: "<OS_PASSWORD>"
          project_name: "<OS_PROJECT_NAME>"
          project_domain_name: "<OS_PROJECT_DOMAIN_NAME>"
          user_domain_name: "<OS_USER_DOMAIN_NAME>"
        region_name: hetzner
        verify: false
        interface: public
        identity_api_version: 3
```

::: warning
`auth_url` MUST point at the gateway endpoint (`https://keystone.rpcu.vpn/v3`), not the in-cluster Keystone service (`https://keystone.yaook.svc:5000/v3`).
:::

**Consumers:**

1. CAPO InfrastructureProvider (`infrastructure-openstack.yaml`)
2. `capo-identity` ExternalSecret → `mgmt/mgmt-cloud-config` (Cluster `identityRef`)
3. `openstack-ccm-identity` ExternalSecret → `kube-system/cloud-config` (OCCM + Cinder CSI)
4. `external-dns` ExternalSecret → `external-dns/openstack-credentials` (Designate webhook)

Three Flux Kustomizations use `wait: false` because they depend on this manually-placed secret: `capo-identity`, `openstack-ccm-identity`, `external-dns`.

### ESO-Synced Secrets

| Secret                  | Namespace      | Source                                                | Consumer                      |
| ----------------------- | -------------- | ----------------------------------------------------- | ----------------------------- |
| `mgmt-cloud-config`     | `mgmt`         | `capo-variables.clouds.yaml`                          | Cluster `identityRef` (CAPO)  |
| `cloud-config`          | `kube-system`  | `capo-variables.clouds.yaml` + generated `cloud.conf` | OCCM + Cinder CSI             |
| `openstack-credentials` | `external-dns` | `capo-variables.clouds.yaml`                          | ExternalDNS Designate webhook |

---

## Hardcoded OpenStack IDs

Resource IDs generated at cluster creation time — cannot be changed after the fact.

### External/Floating Network ID

**UUID**: `1cfd69da-057c-4748-a0d4-de5b0ca77db2`

| File                                                        | Purpose                                   |
| ----------------------------------------------------------- | ----------------------------------------- |
| `clusters/mgmt/clusters/mgmt.yaml`                          | Cluster variable `externalNetworkId`      |
| `infrastructure/openstack-ccm-identity/externalsecret.yaml` | `floating-network-id` in CCM `cloud.conf` |
| `clusters/mgmt/apps/chihiro/cm.yaml`                        | Chihiro cluster template variable         |

**Find it**: `openstack network list --external` on the OpenStack cluster.

### Ceph RBD Secret UUID

**UUID**: `b3ab713d-912b-49ed-adaf-bd74368e567a`

| File                               | Purpose                                       |
| ---------------------------------- | --------------------------------------------- |
| `infrastructure/yaook/nova.yaml`   | Nova `uuid` for Ceph RBD backend              |
| `infrastructure/yaook/cinder.yaml` | Cinder `rbd_secret_uuid` for Ceph RBD backend |

### Default Security Group ID

**UUID**: `2deeb13d-88e2-4f3a-adc8-173b9af365e7`

| File                                                                | Purpose                               |
| ------------------------------------------------------------------- | ------------------------------------- |
| `infrastructure/crossplane-resources/openstack/securityGroups.yaml` | Crossplane `external-name` annotation |

### Admin Project ID

**UUID**: `bae33843e66e4028b574e36cd0953fac`

| File                                                               | Purpose                               |
| ------------------------------------------------------------------ | ------------------------------------- |
| `infrastructure/crossplane-resources/openstack/project-admin.yaml` | Crossplane `external-name` annotation |

---

## Environment-Specific Values

| Value                  | Current Setting                        | Where to Set                                                      |
| ---------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| External Network UUID  | `1cfd69da-057c-4748-a0d4-de5b0ca77db2` | See [External/Floating Network ID](#external-floating-network-id) |
| API Server Floating IP | `172.16.255.212`                       | `clusters/mgmt/clusters/mgmt.yaml`, `clusters/mgmt/cilium.yaml`   |
| Kubernetes Version     | `v1.35.4`                              | `clusters/mgmt/clusters/mgmt.yaml`                                |
| Image Name             | `hephaestus-kaas-25.11-v1.35.4`        | `clusters/mgmt/clusters/mgmt.yaml`                                |
| Flavors                | `xmedium` (CP + workers)               | `clusters/mgmt/clusters/mgmt.yaml`                                |
| Managed Subnet CIDR    | `192.168.1.0/24`                       | `clusters/mgmt/clusters/mgmt.yaml`                                |
| Region                 | `hetzner`                              | `capo-variables` clouds.yaml                                      |
| Keystone auth_url      | `https://keystone.rpcu.vpn/v3`         | `capo-variables` clouds.yaml                                      |
| Designate Zone         | `rpcu.lan.`                            | `infrastructure/crossplane-resources/openstack/zonedns.yaml`      |
