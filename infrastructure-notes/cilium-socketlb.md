# Cilium socketLB.hostNamespaceOnly

## Problem

Cilium's socket-level LoadBalancer (SocketLB) intercepts `connect()` calls inside pods to do ClusterIP load balancing at the socket layer. On a normal cluster this is fine. On the OpenStack cluster it's not — the nodes run nested KVM/QEMU VMs, and Cilium's socket interception bleeds into guest VM connections, breaking VM networking.

## Solution

Set `socketLB.hostNamespaceOnly: true` on the OpenStack cluster. This limits socket-LB to pods running in the host network namespace only, preventing it from interfering with guest VM traffic.

From `argus/clusters/openstack/cilium.yaml`:

```yaml
socketLB:
  hostNamespaceOnly: true
```

The management cluster (no nested VMs) uses the default `false`.
