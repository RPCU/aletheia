# Kubernetes

This section documents the Kubernetes infrastructure running on our Operating System.

## Overview

We run a High Availability (HA) Kubernetes cluster acting as the control plane for our OpenStack infrastructure. The cluster is bootstrapped using `kubeadm` with a highly declarative configuration managed by NixOS.

## Architecture

-   **Control Plane Nodes:** `lucy`, `makise`, `quinn`
-   **High Availability:** `kube-vip` provides a Virtual IP (VIP) for the API Server.


## Documentation

-   [Architecture Details](./architecture)
-   [Bootstrap Procedure](./bootstrap)
