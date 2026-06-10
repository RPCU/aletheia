# Node Interface Naming

## Problem

Hetzner servers don't guarantee consistent NIC names across reboots. `eno1` might become `enp3s0` after a kernel update, breaking VLAN configuration and OVN bridge mapping.

## Solution

systemd-networkd link files match interfaces by MAC address and force consistent names:

```nix
systemd.network.links = {
  "00-eno1" = {
    matchConfig.PermanentMACAddress = "b4:2e:99:cd:02:76"; # lucy's MAC
    linkConfig.Name = "eno1";
  };
  "01-enp3s0" = {
    matchConfig.PermanentMACAddress = "6c:b3:11:5d:26:7a"; # lucy's OpenStack NIC
    linkConfig.Name = "enp3s0";
  };
};
```

Each node profile (lucy, makise, quinn) defines its own MAC addresses. This ensures `eno1` always carries Kubernetes traffic and `enp3s0` always connects to `br-ex`.
