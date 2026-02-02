# Kubernetes

This section documents the Kubernetes infrastructure running on our Operating System.

## Overview

We run a High Availability (HA) Kubernetes cluster acting as the control plane for our OpenStack infrastructure. The cluster is bootstrapped using `kubeadm` with a highly declarative configuration managed by NixOS.

## Purpose & Scope

This baremetal cluster serves a single, critical purpose: **Infrastructure as a Service (IaaS)**.

-   **Hosting OpenStack:** It is designed exclusively to host the OpenStack control plane components.
-   **Not for Workloads:** This is *not* the target environment for general user applications or services.

### Future Kubernetes as a Service (KaaS)

Final user workloads will run on separate Kubernetes clusters deployed **as Virtual Machines** on top of the OpenStack infrastructure. These downstream clusters will be managed using [Cluster API (CAPI)](https://cluster-api.sigs.k8s.io/) with the OpenStack provider (**CAPO**), enabling a full Kubernetes-as-a-Service experience.

## Architecture

-   **Control Plane Nodes:** `lucy`, `makise`, `quinn`
-   **High Availability:** `kube-vip` provides a Virtual IP (VIP) for the API Server.


## Documentation

-   [Architecture Details](./architecture)
-   [Bootstrap Procedure](./bootstrap)
