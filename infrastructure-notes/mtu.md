# MTU Considerations

## Problem

The cluster has multiple network layers, each adding encapsulation overhead. VXLAN adds 50 bytes, GRE adds 28 bytes, OVN adds its own headers. If the MTU is set to the standard 1500 on all interfaces, encapsulated packets exceed the physical link MTU, causing fragmentation, dropped packets, or silent TCP retransmissions that cripple performance.

## Where MTU Matters

| Interface     | MTU   | Why                                                        |
| ------------- | ----- | ---------------------------------------------------------- |
| `eno1`        | 1500  | Physical NIC, public internet — standard                   |
| `eno1.4000`   | 1400  | VLAN for inter-node traffic — headroom for VXLAN if needed |
| `br-ex`       | 1500  | OpenStack external bridge — VMs connect here               |
| OVN overlay   | 1400  | Neutron `global_physnet_mtu: 1400`, `path_mtu: 1400`       |
| VM interfaces | ~1400 | Inherited from Neutron subnet MTU                          |
| Netbird WG    | 1280  | WireGuard default — conservative for cross-network paths   |

## Configuration

From `argus/infrastructure/yaook/neutron.yaml`:

```yaml
neutronConfig:
  DEFAULT:
    global_physnet_mtu: 1400
    advertise_mtu: True
    enable_tcp_mss_clamping: True
  neutronML2Config:
    ml2:
      path_mtu: 1400
      physical_network_mtus: enp3s0:1400
```

From `hephaestus/nixosModules/vlanConfiguration.nix` — the VLAN sub-interface:

```nix
interfaces."eno1.4000" = {
  mtu = 1400;
};
```

`advertise_mtu: True` tells Neutron to set the MTU option in DHCP responses, so VMs automatically configure their interface MTU. `enable_tcp_mss_clamping: True` adjusts TCP MSS to fit within the reduced MTU, preventing black-hole fragmentation where SYN packets succeed but data transfers fail.

The default OpenStack network (non-external) uses MTU 1342 — slightly lower to leave room for additional VXLAN encapsulation within the overlay.
