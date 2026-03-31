# Virtual Machine Testing

This guide explains how to test installation images and configurations locally within a Virtual Machine environment before deployment.

## Prerequisites

- [Devenv](https://devenv.sh/) installed
- [Direnv](https://direnv.net/) recommended for automatic environment loading
- QEMU installed (included in Hephaestus devenv)

## Test Execution

Use the `test-iso` script at the root of the [Hephaestus repository](https://github.com/RPCU/hephaestus) to spawn a VM and simulate the installation process.

```bash
devenv shell test-iso --argstr partition <partition_profile> --argstr cloud <cloud_init_config>
```

### Parameters

| Parameter            | Description                                                                |
| :------------------- | :------------------------------------------------------------------------- |
| `--argstr partition` | The partition layout profile to test.                                      |
| `--argstr cloud`     | Boolean (`true`/`false`) to enable Cloud-Init, or a specific profile name. |

**Locating Profiles:**

- **Partition Profiles**: Defined within the [`installer/partitions/`](https://github.com/RPCU/hephaestus/tree/main/installer/partitions) directory of the Hephaestus repository.

## Usage Example

```bash
# Enter the development environment
cd /path/to/hephaestus
devenv shell test-iso --argstr partition default70G --argstr cloud true

# Or with direnv (recommended)
cd /path/to/hephaestus
test-iso --argstr partition default70G --argstr cloud true
```

## Observation

Upon execution, a QEMU virtual machine window will appear. The installation process will proceed automatically, allowing you to visually verify the boot sequence, partitioning, and system provisioning steps.
