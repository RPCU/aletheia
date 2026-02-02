# Virtual Machine Testing

This guide explains how to test installation images and configurations locally within a Virtual Machine environment before deployment.

## Test Execution

Use the `runIso` utility within the `nix-shell` (from the [Hephaestus repository](https://github.com/RPCU/hephaestus) root) to spawn a VM and simulate the installation process.

```bash
nix-shell
runIso <partition_profile> <cloud_init_config>
```

### Parameters

| Parameter | Description |
| :--- | :--- |
| `<partition_profile>` | The partition layout profile to test. |
| `<cloud_init_config>` | Boolean (`true`/`false`) to enable Cloud-Init, or a specific profile name. |

## Observation

Upon execution, a QEMU virtual machine window will appear. The installation process will proceed automatically, allowing you to visually verify the boot sequence, partitioning, and system provisioning steps.
