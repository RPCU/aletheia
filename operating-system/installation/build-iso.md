# ISO Image Generation

This guide details the process for building a bootable ISO image using the Hephaestus environment.

## Build Command

To generate an ISO image, execute the `buildIso` command within the `nix-shell` environment at the root of the [Hephaestus repository](https://github.com/RPCU/hephaestus).

```bash
nix-shell
buildIso <partition_profile> <cloud_init_config>
```

### Parameters

| Parameter | Description |
| :--- | :--- |
| `<partition_profile>` | The identifier for the disk partition layout profile to be used. |
| `<cloud_init_config>` | Boolean (`true`/`false`) to enable Cloud-Init, or the name of a specific profile configuration. |

## Usage Example

```bash
# Example: Build an ISO with the 'standard' partition layout and cloud-init enabled
buildIso standard true
```