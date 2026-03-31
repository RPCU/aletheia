# ISO Image Generation

This guide details the process for building a bootable ISO image using the Hephaestus environment.

## Prerequisites

- [Devenv](https://devenv.sh/) installed
- [Direnv](https://direnv.net/) recommended for automatic environment loading

## Build Command

To generate an ISO image, use the `build-iso` script at the root of the [Hephaestus repository](https://github.com/RPCU/hephaestus):

```bash
devenv exec build-iso --argstr partition <partition_profile> --argstr cloud <cloud_init_config>
```

### Parameters

| Parameter            | Description                                                                                     |
| :------------------- | :---------------------------------------------------------------------------------------------- |
| `--argstr partition` | The identifier for the disk partition layout profile to be used.                                |
| `--argstr cloud`     | Boolean (`true`/`false`) to enable Cloud-Init, or the name of a specific profile configuration. |

**Locating Profiles:**

- **Partition Profiles**: Defined within the [`installer/partitions/`](https://github.com/RPCU/hephaestus/tree/main/installer/partitions) directory of the Hephaestus repository.

## Usage Example

```bash
# Enter the development environment
cd /path/to/hephaestus
devenv exec build-iso --argstr partition default70G --argstr cloud true

# Or with direnv (recommended)
cd /path/to/hephaestus
build-iso --argstr partition default70G --argstr cloud true
```

The ISO will be generated in `./result/iso/`.
