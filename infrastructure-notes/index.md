# Infrastructure Notes

Custom solutions and non-obvious configurations specific to running OpenStack on Kubernetes with NixOS on baremetal. Standard Kubernetes/OpenStack guides don't cover these — they came from real problems encountered during deployment.

## Sections

- [DNS Resolution](./dns-resolution) — dnsmasq split DNS on br-ex for OpenStack VMs
- [Cilium socketLB](./cilium-socketlb) — `hostNamespaceOnly: true` for nested VMs
- [Hetzner vSwitch](./hetzner-vswitch) — VLAN 4000 for private inter-node network
- [VIP Failover](./vip-failover) — Keepalived VRRP for API server and VM gateway HA
- [Netbird VPN](./netbird-vpn) — WireGuard mesh VPN for operator access
- [MTU Considerations](./mtu) — Why 1400 everywhere, MSS clamping
- [NAT](./nat) — SNAT for VM internet access
- [OVN Bridge](./ovn-bridge) — br-ex with enp3s0 uplink
- [Cilium OVN Interface](./cilium-ovn-interface) — adding br-int to Cilium for pod-to-VM routing
- [Kernel Modules](./kernel-modules) — openvswitch, vxlan, kvm-intel, etc.
- [Node Interface Naming](./interface-naming) — MAC-based systemd-networkd link files
