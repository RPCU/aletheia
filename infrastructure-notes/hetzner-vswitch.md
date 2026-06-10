# Hetzner vSwitch VLAN 4000

## Problem

The three baremetal nodes need a private, low-latency network for Kubernetes API traffic (kube-vip VIP, etcd, inter-node communication). Hetzner dedicated servers don't have a shared private network by default — only the public vSwitch VLAN is available.

## How Hetzner vSwitch Works

Hetzner's vSwitch is a Layer 2 switch that connects dedicated servers across datacenter locations. It operates at the Ethernet frame level — traffic between vSwitch members is switched, not routed, so there's no IP layer between them. Each node gets a VLAN-tagged sub-interface on top of its physical NIC (`eno1`).

The vSwitch is configured in the Hetzner Cloud Console and assigns a VLAN ID (4000 in this case). All nodes plugged into the same vSwitch can communicate over that VLAN as if they were on the same physical switch. Hetzner handles the switching fabric — the nodes just need to tag their frames with the right VLAN ID.

## Solution

VLAN 4000 on the Hetzner vSwitch carries the private `10.0.0.0/24` network between nodes. Each node gets an `eno1.4000` sub-interface with a static IP (lucy: `10.0.0.2`, makise: `10.0.0.3`, quinn: `10.0.0.4`).

From `hephaestus/nixosModules/vlanConfiguration.nix`:

```nix
vlanConfiguration = {
  enable = true;
  vswitch = {
    enable = true;
    interface = "eno1";
    vlans = [{
      vlanId = 4000;
      privateAddress = "10.0.0.${toString nodeIndex}";
      prefixLength = 24;
    }];
  };
};
```

Traffic on this VLAN carries: kube-vip API server VIP, etcd peer communication, keepalived VRRP heartbeats, and Cilium L2 announcements. The private network is not routable from the internet — it's purely for inter-node communication.
