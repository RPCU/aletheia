# Netbird VPN

## Problem

Operators need secure access to the cluster from outside the Hetzner network. SSH port-forwarding or public IPs alone don't work — the Kubernetes API, OpenStack Horizon, and other services are on private IPs. A VPN is needed, but setting up WireGuard manually on each node and managing peer configs doesn't scale.

## Solution

[Netbird](https://netbird.io/) is a WireGuard-based mesh VPN that runs on all nodes. It creates a virtual network interface (`netbird-wg0`) on each machine, assigning IPs from a separate subnet. Operators join the Netbird network from their laptops and get direct access to cluster services.

Netbird is enabled on all nodes via the NixOS module:

```nix
services.netbird.enable = true;
```

The `sunraku` VPS also runs Netbird, providing a jump host for external access without needing the Hetzner vSwitch.

## How It Fits

Netbird operates independently of the Kubernetes and OpenStack networks. It adds a third network layer:

```
eno1.4000 (VLAN 4000)    — Private cluster network (10.0.0.0/24)
br-ex                   — OpenStack external network (172.16.0.0/16)
netbird-wg0             — Operator VPN mesh (100.x.x.x/32)
```

Operators on the Netbird network can reach: Kubernetes API, OpenStack API endpoints (`*.rpcu.vpn` via dnsmasq), and SSH into any node. No port-forwarding rules needed — Netbird handles NAT traversal automatically.
