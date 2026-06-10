# ISO Image Generation

Build a bootable NixOS ISO using the [Hephaestus](https://github.com/RPCU/hephaestus) environment.

::: tip
For the full workflow (build ISO → install on hardware → bootstrap Kubernetes → deploy Flux), see the [Cluster Bootstrap Guide](../../bootstrap/openstack/kubernetes.md).
:::

## Build

```bash
git clone git@github.com:RPCU/hephaestus.git && cd hephaestus
devenv shell
build-iso --argstr partition root --argstr cloud false
```

Output goes to `./output/`.

## Parameters

| Parameter            | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| `--argstr partition` | Disk layout: `root` (NVMe/UEFI), `root-grub` (BIOS), `small` (VMs), `test` |
| `--argstr cloud`     | `false` (baremetal), `true` (cloud-init), or a hostname string             |
| `--argstr disk`      | Optional: specific device (e.g., `/dev/nvme0n1`)                           |

## Partition Layouts

Defined in `installer/partitions/`:

| Profile     | Boot | Layout                                           |
| ----------- | ---- | ------------------------------------------------ |
| `root`      | UEFI | `/var` 200G, `/nix` 200G, `/` 100G (LVM on NVMe) |
| `root-grub` | BIOS | Single root LV                                   |
| `small`     | UEFI | `/var` 5G, `/nix` 30G, `/` 2G                    |

## First Boot Behavior

1. ISO auto-logs in as `nixos` and runs `sudo installer`
2. Installer: auto-detects disk → wipes → partitions (disko) → `nixos-install` → reboot
3. First boot: `ginx` pulls hephaestus repo → `colmena apply-local --sudo` → reboot into final state

After this, the node auto-updates via `ginx` every 60 seconds — see [Deployment & Upgrades](../installation/apply.md).

## Testing in QEMU

```bash
devenv exec runIso --argstr partition root --argstr cloud false
```

Boots the ISO in a 50G virtual disk, SSH at `localhost:2222`.
