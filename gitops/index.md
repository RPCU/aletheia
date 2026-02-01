# GitOps

Learn about Argus, our GitOps-based infrastructure management using FluxCD.

## Overview

RPCU uses [Argus](https://github.com/RPCU/argus), our GitOps repository, to manage infrastructure declaratively with automated reconciliation and version control.

## What is Argus?

Argus is our GitOps implementation that provides:
- **Declarative Infrastructure** - Define all infrastructure as code in Git
- **Automated Reconciliation** - FluxCD continuously syncs desired state with actual state
- **Version Control** - Full audit trail of all infrastructure changes
- **Multi-Environment Support** - Manage dev, staging, and production consistently

## How It Works

1. **Define** - Write infrastructure manifests
2. **Commit** - Push changes to the Argus repository
3. **Review** - Team reviews changes via pull requests
4. **Reconcile** - FluxCD detects changes and applies them automatically
5. **Verify** - Monitor deployment status and health
