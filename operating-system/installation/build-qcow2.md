# QCOW2 Image Generation

This guide outlines the procedure for creating QCOW2 disk images, primarily for use in virtualized environments such as OpenStack.

## Build Command

To generate a QCOW2 image, utilize the `buildQcow2` command within the `nix-shell` at the root of the [Hephaestus repository](https://github.com/RPCU/hephaestus).

```bash
nix-shell
buildQcow2 <profile_name>
```

### Parameters

| Parameter        | Description                                             |
| :--------------- | :------------------------------------------------------ |
| `<profile_name>` | The name of the system profile to build into the image. |

**Locating Profiles:**

- **System Profiles (`<profile_name>`)**: Defined in the [`profiles/`](https://github.com/RPCU/hephaestus/tree/main/profiles) directory of the Hephaestus repository. Each subdirectory represents a profile name.

## Deployment Notes

### Generic Profile Installation

When running the generated ISO in a fresh Virtual Machine, the system will automatically install the generic profile by default.

For details on customizing the system after installation, please refer to the [System Customization](../customization) guide.
