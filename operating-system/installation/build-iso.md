# ISO Image Generation

This guide details the process for building a bootable ISO image using the Hephaestus environment.

## Build Command

To generate an ISO image, execute the `buildIso` command (automatically available if you have direnv installed otherwise you can run `devbox shell`) at the root of the [Hephaestus repository](https://github.com/RPCU/hephaestus).

```bash
buildIso <partition_profile> <cloud_init_config>
```

### Parameters

| Parameter             | Description                                                                                     |
| :-------------------- | :---------------------------------------------------------------------------------------------- |
| `<partition_profile>` | The identifier for the disk partition layout profile to be used.                                |
| `<cloud_init_config>` | Boolean (`true`/`false`) to enable Cloud-Init, or the name of a specific profile configuration. |

**Locating Profiles:**

- **System Profiles (`<cloud_init_config>`)**: Defined in the [`profiles/`](https://github.com/RPCU/hephaestus/tree/main/profiles) directory of the Hephaestus repository. Each subdirectory represents a profile name.
- **Partition Profiles (`<partition_profile>`)**: Defined within the [`installer/partitions/`](https://github.com/RPCU/hephaestus/tree/main/installer/partitions) directory of the Hephaestus repository. Each file or subdirectory typically corresponds to a partition scheme.

## Usage Example

```bash
# Example: Build an ISO with the 'standard' partition layout and cloud-init enabled
buildIso standard true
```
