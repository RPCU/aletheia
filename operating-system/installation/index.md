# Installation & Deployment

This section provides comprehensive guides for building system images, performing installations, and managing upgrades.

## Available Procedures

- **[ISO Image Generation](./build-iso)**: Build bootable ISO images for physical or virtual media.
- **[QCOW2 Image Generation](./build-qcow2)**: Create QCOW2 images for virtualization platforms like OpenStack.
- **[Deployment & Upgrades](./apply)**: Apply configurations and upgrade running systems via Colmena and Ginx.
- **[Virtual Machine Testing](./testing)**: Test configurations in a local QEMU virtualized environment.

## Quick Start

For baremetal installation (lucy, makise, quinn):

```bash
# 1. Build the ISO
cd hephaestus
devenv shell
build-iso --argstr partition root --argstr cloud false

# 2. Write to USB and boot the target node
dd if=./output/*.iso of=/dev/sdX bs=4M status=progress

# 3. After install, the node auto-configures via ginx
```

For the full bootstrap process including Kubernetes and Flux, see the [Cluster Bootstrap Guide](../../bootstrap/openstack/kubernetes.md).
