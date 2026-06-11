# Kubernetes

This section documents the Kubernetes infrastructure running on our Operating System.

## Overview

We run a High Availability (HA) Kubernetes cluster acting as the control plane for our OpenStack infrastructure. The cluster is bootstrapped using `kubeadm` with a highly declarative configuration managed by NixOS.

## Purpose & Scope

This baremetal cluster serves a single, critical purpose: **Infrastructure as a Service (IaaS)**.

- **Hosting OpenStack:** It is designed exclusively to host the OpenStack control plane components.
- **Not for Workloads:** This is _not_ the target environment for general user applications or services.

### Kubernetes as a Service (KaaS)

See [Kubernetes → Workload Clusters](../../kubernetes/#workload-clusters-kaas).

## Architecture

- **Control Plane Nodes:** `lucy`, `makise`, `quinn`
- **High Availability:** `kube-vip` provides a Virtual IP (VIP) for the API Server.

## Documentation

- [Architecture Details](./architecture) — Node layout, HA, kubeadm config
- [Bootstrap Procedure](./bootstrap) — kubeadm init/join commands (OpenStack cluster only)
- [OpenStack Cluster Bootstrap](../../bootstrap/openstack-cluster.md) — Full end-to-end: OS install → kubeadm → Cilium → Flux
- [Management Cluster Bootstrap](../../bootstrap/management-cluster.md) — CAPI-managed: kind → pivot → self-managing
