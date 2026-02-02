# Virtual Machine Testing

This guide explains how to test installation images and configurations locally within a Virtual Machine environment before deployment.

## Test Execution

Use the `runIso` command (automatically available if you have direnv installed otherwise you can run `devbox shell`) at the root of the [Hephaestus repository](https://github.com/RPCU/hephaestus) to spawn a VM and simulate the installation process.

```bash
runIso <partition_profile> <cloud_init_config>
```

### Parameters

| Parameter             | Description                                                                |
| :-------------------- | :------------------------------------------------------------------------- |
| `<partition_profile>` | The partition layout profile to test.                                      |
| `<cloud_init_config>` | Boolean (`true`/`false`) to enable Cloud-Init, or a specific profile name. |

**Locating Profiles:**

- **System Profiles (`<cloud_init_config>`)**: Defined in the [`profiles/`](https://github.com/RPCU/hephaestus/tree/main/profiles) directory of the Hephaestus repository. Each subdirectory represents a profile name.
-   **Partition Profiles (`<partition_profile>`)**: Defined within the [`installer/partitions/`](https://github.com/RPCU/hephaestus/tree/main/installer/partitions) directory of the Hephaestus repository. Each file or subdirectory typically corresponds to a partition scheme.

## Observation

Upon execution, a QEMU virtual machine window will appear. The installation process will proceed automatically, allowing you to visually verify the boot sequence, partitioning, and system provisioning steps.
