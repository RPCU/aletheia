# Cilium OVN Interface

## Problem

Cilium is the CNI for the OpenStack cluster, but it only knows about `eno1.4000` for pod routing. OVN manages its own integration bridge (`br-int`) for OpenStack VM networking. Without Cilium being aware of the OVN bridge, Kubernetes pods cannot communicate with OpenStack VMs — traffic to VMs is dropped because Cilium's eBPF datapath doesn't know how to route to the OVN bridge.

The `cni.exclusive: false` setting allows OVN and Cilium to coexist, but the routing gap remains.

## Solution

Add the OVN-managed interface to Cilium's device list so its eBPF datapath can route traffic through `br-int` to reach VMs.

From `argus/clusters/openstack/cilium.yaml`, the Cilium HelmRelease currently patches `extraArgs` with only the VLAN interface:

```yaml
extraArgs:
  - --devices=eno1.4000
  - --direct-routing-device=eno1.4000
```

`br-int` needs to be added to the `--devices` list:

```yaml
extraArgs:
  - --devices=eno1.4000
  - --direct-routing-device=eno1.4000
  - --devices=br-int
```

This tells Cilium to also listen on `br-int`, enabling pod-to-VM traffic through OVN's integration bridge.

## Why It Matters

Without this, pods running on the OpenStack cluster (e.g., OpenStack API services) can't reach VMs managed by Nova/OVN. The two networking planes — Cilium (Kubernetes) and OVN (OpenStack) — operate independently on separate bridges. Adding `br-int` to Cilium's device list bridges this gap.

## References

- [Cilium socketLB](./cilium-socketlb) — why `hostNamespaceOnly: true` is also needed on this cluster
- [OVN Bridge](./ovn-bridge) — how `br-ex` with `enp3s0` uplink is configured for external VM access
