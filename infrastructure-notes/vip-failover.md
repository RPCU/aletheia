# VIP Failover with Keepalived

## Problem

With only 3 baremetal nodes, any single node failure must not take down the cluster. Two critical services need to survive a node death: the Kubernetes API server (used by kubectl, controllers, kubelet) and the VM external network gateway/DNS (used by all OpenStack VMs). Without failover, losing the node holding these IPs means losing the entire cluster or all VM connectivity.

## Solution

Keepalived runs on all three nodes and manages two VRRP (Virtual Router Redundancy Protocol) instances. Each instance floats a virtual IP between nodes — if the MASTER dies, a BACKUP takes over within seconds.

### VRRP Instance 1: Kubernetes API Server VIP

| Property          | Value                         |
| ----------------- | ----------------------------- |
| VIP               | `178.63.143.219/32`           |
| Interface         | `eno1.4000` (VLAN 4000)       |
| Virtual Router ID | 51                            |
| Protocol          | VRRPv2, unicast between nodes |

This is the kube-vip address. The kubernetes API server listens here, and all kubelets/controllers connect to it. If lucy (priority 100) dies, makise (priority 99) takes over the VIP. The kubelet on each node uses this address in its kubeconfig, so it reconnects to the new MASTER automatically.

### VRRP Instance 2: External Network Gateway / DNS

| Property          | Value                         |
| ----------------- | ----------------------------- |
| VIP               | `172.16.0.254/16`             |
| Interface         | `br-ex`                       |
| Virtual Router ID | 52                            |
| Protocol          | VRRPv2, unicast between nodes |

This is the gateway for all OpenStack VMs on the external network. Neutron configures VMs to use `172.16.0.254` as their default route and DNS server. If the node holding this VIP fails, another node takes over and VM traffic routes through the new MASTER. dnsmasq on `br-ex` uses `bind-dynamic` to follow the VIP without restart.

### Node Priorities

| Node   | Priority | Role                              |
| ------ | -------- | --------------------------------- |
| lucy   | 100      | MASTER (normally holds both VIPs) |
| makise | 99       | BACKUP                            |
| quinn  | 98       | BACKUP                            |

All nodes start in `BACKUP` state. The highest priority wins the election. Unicast peering (no multicast needed — Hetzner vSwitch doesn't support it):

```nix
keepalived = {
  vrrpInstances."VI_1" = {  # API server VIP
    interface = "eno1.4000";
    state = "BACKUP";
    virtualRouterId = 51;
    priority = 100;          # per-node
    unicastSrcIp = "10.0.0.2";
    unicastPeers = [ "10.0.0.3" "10.0.0.4" ];
    virtualIps = [{ addr = "178.63.143.219/32"; dev = "eno1"; }];
  };
  vrrpInstances."VI_2" = {  # External gateway VIP
    interface = "eno1.4000";
    state = "BACKUP";
    virtualRouterId = 52;
    priority = 100;
    unicastSrcIp = "10.0.0.2";
    unicastPeers = [ "10.0.0.3" "10.0.0.4" ];
    virtualIps = [{ addr = "172.16.0.254/16"; dev = "br-ex"; }];
  };
};
```

## Failure Scenarios

| Node lost     | API VIP moves to       | Gateway VIP moves to   | Impact                                   |
| ------------- | ---------------------- | ---------------------- | ---------------------------------------- |
| lucy (MASTER) | makise                 | makise                 | Brief API + VM connectivity blip (~1-3s) |
| makise        | lucy (reclaims)        | lucy (reclaims)        | Same                                     |
| quinn         | no change (lucy keeps) | no change (lucy keeps) | None — lucy was already MASTER           |

With 3 nodes, the cluster tolerates 1 node failure. Losing 2 nodes means losing quorum (etcd needs 2/3 members) and both VIPs.
