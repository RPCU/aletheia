# GitOps

Learn about Argus, our GitOps-based infrastructure management using FluxCD.

## Overview

RPCU uses [Argus](https://github.com/RPCU/argus), our GitOps repository, to manage infrastructure declaratively with automated reconciliation and version control.

## What is Argus?

Argus is our GitOps implementation that provides:

- **Declarative Infrastructure** - Define all infrastructure as code in Git
- **Automated Reconciliation** - FluxCD continuously syncs desired state with actual state
- **Version Control** - Full audit trail of all infrastructure changes
- **Multi-Cluster Support** - Manage management and OpenStack clusters from a single repository

## How It Works

1. **Define** - Write infrastructure manifests (Kustomize overlays, HelmReleases)
2. **Commit** - Push changes to the Argus repository
3. **Review** - Team reviews changes via pull requests
4. **Reconcile** - FluxCD detects changes and applies them automatically
5. **Verify** - Monitor deployment status and health

## Two-Cluster Architecture

Argus manages two distinct clusters from a single Git repository:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RPCU/argus (Git)                              │
│                                                                 │
│  clusters/mgmt/          clusters/openstack/                    │
│  ├─ CAPI providers       ├─ Yaook operators                    │
│  ├─ ClusterClass         ├─ OpenStack services                 │
│  ├─ OCCM (Octavia LB)    ├─ Cilium (L2 LB)                    │
│  ├─ Cinder CSI           ├─ Rook/Ceph storage                  │
│  ├─ ExternalDNS          └─ Crossplane                         │
│  └─ self-managing                                                       │
└─────────────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌──────────────────┐     ┌──────────────────────┐
│  Management      │     │  OpenStack Cluster    │
│  Cluster (mgmt)  │     │  (baremetal)          │
│  OpenStack VMs   │     │  lucy, makise, quinn  │
│  CAPI self-mgmt  │     │  kubeadm + kube-vip   │
└──────────────────┘     └──────────────────────┘
```

## Documentation

- [FluxCD Overview](./fluxcd/overview.md) - How Flux is deployed via Operator + FluxInstance
- [Management Cluster](./fluxcd/management-cluster.md) - CAPI management cluster setup
- [OpenStack Cluster](./fluxcd/openstack-cluster.md) - Production OpenStack cluster
- [Cluster API Pivot](./fluxcd/capi-pivot.md) - Bootstrap with kind, pivot to OpenStack VMs
