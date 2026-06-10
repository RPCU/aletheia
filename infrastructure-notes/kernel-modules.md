# Kernel Modules for OpenStack

Standard NixOS doesn't load the kernel modules OpenStack needs. The baremetal nodes explicitly load:

```nix
boot.kernelModules = [
  "openvswitch"  # OVS software switch
  "gre"          # GRE tunneling
  "vxlan"        # VXLAN overlay
  "bridge"       # Linux bridge
  "ip6_tables"   # IPv6 firewall
  "ebtables"     # Ethernet bridge filtering
  "kvm-intel"    # Intel KVM (nested virtualization)
  "rbd"          # Ceph RADOS block device
  "nbd"          # Network block device (Ceph CSI)
];
```

Without these, OVN/OVS and Nova's QEMU hypervisor fail to start.
