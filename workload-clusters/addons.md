# Add-on Deployment with Sveltos

Workload clusters are not bootstrapped by hand. [Sveltos](https://projectsveltos.github.io/) runs on the management cluster and pushes add-ons to workload clusters declaratively via `ClusterProfile` resources. Each `ClusterProfile` targets clusters by label selectors, so add-ons are opt-in — a workload cluster gets only what it opts into.

## How it works

1. A `ClusterProfile` selects workload clusters by label (e.g. `sveltos.argus.rpcu.io/cilium: enabled`).
2. Sveltos pushes Helm charts, raw manifests, or ConfigMap-templated resources to every matching cluster.
3. Sync modes control lifecycle: `OneTime` for bootstrap installs, `ContinuousWithDriftDetection` for ongoing reconciliation with automatic drift correction.

## Add-ons

### GitOps (Flux)

Bootstraps Flux on every workload cluster (`type: workload`). Two ClusterProfiles work together:

1. **`flux`** (`OneTime`) — installs the Flux Operator Helm chart. One-shot: once installed, the operator self-manages.
2. **`flux-instance`** (`ContinuousWithDriftDetection`) — creates a `FluxInstance` CR that reconciles the Flux distribution from Argus. Continuously enforced with drift detection.

The FluxInstance syncs `infrastructure/fluxcd/operator` from Argus, with `cluster.domain` patched per-cluster to `<cluster-name>.local`. Opt-in add-ons (Cilium, OIDC RBAC) are **not** in the FluxInstance sync path — they are pushed by their own ClusterProfiles, so a shared Git path can't force an addon onto every cluster.

### Networking (Cilium)

Bootstraps the CNI so pods can schedule. Opt-in via `sveltos.argus.rpcu.io/cilium: enabled`. Two ClusterProfiles:

1. **`cilium`** (`ContinuousWithDriftDetection`) — installs the Cilium Helm chart directly. Uses Sveltos Go templates to inject per-cluster values (API server host/port, pod CIDR, cluster domain) from the CAPI `Cluster` resource — no manual configuration needed.
2. **`cilium-values`** (`ContinuousWithDriftDetection`) — pushes a `ConfigMap` with cluster-specific values and a Flux `Kustomization` CR that points at `infrastructure/cilium` in Argus. This hands off ongoing Cilium reconciliation to Flux on the workload cluster.

The split exists because workload clusters are kube-proxy-free and have no CNI/DNS at bootstrap — Cilium must be told the API server endpoint directly. The `cilium` profile handles this initial install; `cilium-values` hands the baton to GitOps.

### OIDC & RBAC

Pushes RBAC bindings and a Kamaji kubelet workaround. Opt-in via `sveltos.argus.rpcu.io/oidc-rbac: enabled`.

**`oidc-rbac`** (`ContinuousWithDriftDetection`) deploys:

- `ClusterRoleBinding` mapping the `kube-admin` Zitadel group to `cluster-admin`
- `ClusterRoleBinding` mapping the `kube-user` Zitadel group to `cluster-admin`
- `ClusterRole` + `ClusterRoleBinding` for kube-apiserver → kubelet proxy access (workaround for [clastix/kamaji#1171](https://github.com/clastix/kamaji/issues/1171) — Kamaji does not call kubeadm's `AllowAPIServerToAccessKubeletAPI` phase, so `kubectl logs`/`exec`/`port-forward` break without this)

## Lifecycle

The typical bootstrap sequence on a new workload cluster:

1. Sveltos installs **Cilium** → pods can schedule
2. Sveltos installs **Flux** → GitOps is operational
3. Sveltos pushes **OIDC RBAC** → users can authenticate
4. Flux takes over reconciling application workloads from Argus

Sveltos stays in the loop for drift detection on the infrastructure it deployed.

All templates and ClusterProfiles live in [Argus](https://github.com/RPCU/argus) (`infrastructure/sveltos/`).
