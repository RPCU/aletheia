# Operating System

Learn about Hephaestus, our NixOS-based operating system configurations and custom VM images.

## Overview

RPCU uses [Hephaestus](https://github.com/RPCU/hephaestus), our NixOS forge, to provide declarative, reproducible operating system configurations optimized for OpenStack infrastructure.

## What is Hephaestus?

Hephaestus is our NixOS-based system that provides:
- **Declarative Configuration** - Define your entire OS configuration as code
- **Reproducible Builds** - Same configuration always produces identical results
- **Atomic Updates** - Upgrade or rollback entire system states safely
- **Custom Images** - VM images optimized for OpenStack and RPCU infrastructure

## Key Benefits of NixOS

### Declarative Configuration
Everything from packages to system services is defined in Nix configuration files, making infrastructure truly immutable and version-controlled.

### Reproducibility
Build the same configuration anywhere and get identical results, eliminating "works on my machine" problems.

### Rollback Capability
Every system generation is preserved, allowing instant rollback to previous working states if issues arise.

### Strong Consistency
Nix's functional approach ensures dependencies are always correct and conflicts are impossible.
