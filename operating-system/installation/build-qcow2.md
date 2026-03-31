# QCOW2 Image Generation

This guide outlines the procedure for creating QCOW2 disk images, primarily for use in virtualized environments such as OpenStack.

## Prerequisites

- [Devenv](https://devenv.sh/) installed
- [Direnv](https://direnv.net/) recommended for automatic environment loading

## Build Command

To generate a QCOW2 image, use the `build-qcow2` script at the root of the [Hephaestus repository](https://github.com/RPCU/hephaestus):

```bash
devenv exec build-qcow2 --argstr profile <profile_name>
```

### Parameters

| Parameter          | Description                                             |
| :----------------- | :------------------------------------------------------ |
| `--argstr profile` | The name of the system profile to build into the image. |

**Locating Profiles:**

- **System Profiles**: Defined in the [`profiles/`](https://github.com/RPCU/hephaestus/tree/main/profiles) directory of the Hephaestus repository.

## Usage Example

```bash
# Enter the development environment
cd /path/to/hephaestus
devenv exec build-qcow2 --argstr profile kaas

# Or with direnv (recommended)
cd /path/to/hephaestus
build-qcow2 --argstr profile kaas
```

The QCOW2 image will be generated at `./result/nixos.qcow2`.

## Deployment Notes

### Generic Profile Installation

When running the generated ISO in a fresh Virtual Machine, the system will automatically install the generic profile by default.

For details on customizing the system after installation, please refer to the [System Customization](../customization) guide.
