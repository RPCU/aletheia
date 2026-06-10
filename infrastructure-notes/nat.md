# NAT for VM Internet Access

## Problem

VMs on the `172.16.0.0/16` external network need internet access. The external bridge (`br-ex`) doesn't route to the internet — it's a flat network between the baremetal nodes and their VMs.

## Solution

NixOS-level NAT on each baremetal node masquerades VM traffic going out through `eno1` (the public interface):

```nix
networking.nat = {
  enable = true;
  externalInterface = "eno1";
  internalIPs = [ "172.16.0.0/12" ];
};
```

This is a simple SNAT — VMs share the node's public IP for outbound traffic. Inbound access requires floating IPs or load balancers (Octavia).
