# OVN Bridge Configuration (br-ex)

## Problem

OVN needs a bridge on each node to connect VMs to the external network. The bridge must map to a physical interface and be recognized by OpenStack as the "public" network.

## Solution

Neutron's OVN controller configures `br-ex` with `enp3s0` as the uplink device. This is the OpenStack-dedicated NIC (separate from `eno1` which carries Kubernetes traffic). The bridge is mapped to the `public` physical network in ML2 configuration.

From `argus/infrastructure/yaook/neutron.yaml`:

```yaml
setup:
  ovn:
    controller:
      configTemplates:
        - nodeSelectors:
            - matchLabels: {}
          bridgeConfig:
            - bridgeName: br-ex
              uplinkDevice: enp3s0
              openstackPhysicalNetwork: "public"
```

The `enp3s0` interface is matched by MAC address via systemd-networkd link files (defined per-node in hephaestus profiles) to ensure consistent naming.
