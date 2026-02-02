# Operating System Architecture

This section details the architecture and management of our operating system configurations, powered by NixOS and Hephaestus.

## System Overview

RPCU leverages [Hephaestus](https://github.com/RPCU/hephaestus), a proprietary NixOS forge, to deliver declarative and reproducible operating system configurations. These configurations are specifically engineered for optimization within OpenStack infrastructure environments.

## The Hephaestus Platform

Hephaestus serves as the foundational management system, providing:

-   **Declarative Infrastructure:** Complete operating system definitions expressed as code.
-   **Deterministic Builds:** Guarantees identical output results across different build environments.
-   **Atomic Lifecycle Management:** Facilitates safe system upgrades and immediate rollbacks.
-   **Optimized Artifacts:** Generates specialized VM images tailored for OpenStack and RPCU deployments.

### Boot Requirements
Hephaestus is designed exclusively for systems utilizing **UEFI (Unified Extensible Firmware Interface) BOOT**. Legacy BIOS boot is not supported, with the sole exception of the `sunraku` profile, which is specifically configured for legacy BIOS environments. Ensure your target hardware is configured for the appropriate boot mode prior to deployment.

## Standard Infrastructure Profiles

Hephaestus defines several specialized profiles acting as the pillars of our infrastructure:

-   **`lucy`, `makise`, `quinn`**: These three profiles form the **Baremetal Kubernetes Cluster**. They are dedicated exclusively to hosting the OpenStack Control Plane.
-   **`sunraku`**: A specialized profile dedicated to hosting the **Netbird VPN Server**, securing network access to the infrastructure.
-   **`generic`**: The default fallback profile applied during fresh installations, intended as a blank canvas for further customization.

## Core Advantages of NixOS

### Immutable Configuration
All system aspects, from package management to service orchestration, are defined via Nix configuration files. This ensures infrastructure immutability and facilitates strict version control.

### Environmental Consistency
NixOS eliminates environment-specific discrepancies ("works on my machine") by ensuring that a configuration built in one environment yields the exact same result in another.

### Reliability & Recovery
The system preserves every generation of the configuration. In the event of an issue, administrators can instantly roll back to a previous, stable state.

### Dependency Integrity
Nix's functional package management model ensures rigorous dependency resolution, preventing conflicts and maintaining system integrity.