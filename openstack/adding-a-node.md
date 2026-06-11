# Adding a Node

Growing OpenStack capacity is intentionally simple. Because almost everything is described as code and reconciled by FluxCD, you do **not** edit the [Argus](https://github.com/RPCU/argus) repository to add capacity. You **join a new node to the `openstack` Kubernetes cluster and apply the right node labels** — the Yaook operators do the rest.

## How it works

Yaook operators schedule OpenStack agents onto Kubernetes nodes using `nodeSelectors`. When a node carries labels that an operator's selector matches, the operator automatically:

- schedules the corresponding OpenStack agents onto it (`nova-compute`, the OVN `ovn-controller`),
- registers it as a hypervisor in Nova, and
- wires it into the OVN data plane.

No re-provisioning of the control plane is required — capacity scales by labelling nodes.

## Steps

### 1. Join the node to the Kubernetes cluster

Provision the host with NixOS (see [Operating System](../operating-system/)) and join it to the cluster. For a worker join on the baremetal OpenStack cluster, follow the same kubeadm flow used for the control plane nodes — see [Kubernetes Bootstrap](../operating-system/kubernetes/bootstrap.md).

Verify it appears:

```bash
kubectl get nodes
```

### 2. Apply the node labels

Label the node so the Yaook operators select it. This includes the Yaook management labels (e.g. `node.yaook.cloud/...`) plus any labels the operator `nodeSelectors` match:

```bash
kubectl label node <node-name> <label-key>=<label-value>
```

## Where the selectors live

The relevant operator CRs in Argus select nodes via `nodeSelectors[].matchLabels`:

- **Nova compute** — `infrastructure/yaook/nova.yaml`:

  ```yaml
  compute:
    configTemplates:
      - nodeSelectors:
          - matchLabels: {}
  ```

- **OVN controller** — `infrastructure/yaook/neutron.yaml`:

  ```yaml
  setup:
    ovn:
      controller:
        configTemplates:
          - nodeSelectors:
              - matchLabels: {}
  ```

::: info match-all default
With the current `matchLabels: {}` (match-all), these target **every** node in the cluster — so a freshly joined node is picked up automatically once it has the Yaook management labels. To gate compute/OVN onto specific nodes, set explicit labels in these CRs and apply the matching labels to the node.
:::

## See also

- [OpenStack Cluster](../gitops/fluxcd/openstack-cluster.md) — full component stack, networking, storage.
- [OVN Bridge Configuration](../infrastructure-notes/ovn-bridge.md) — how `br-ex`/`enp3s0` is wired per node.
