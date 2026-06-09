# FluxCD Overview

How Flux is deployed and configured in RPCU clusters using the Flux Operator pattern.

## Architecture

RPCU uses a two-layer Flux deployment model:

1. **Flux Operator** - A one-time `kubectl apply` that installs the operator itself
2. **FluxInstance** - A CRD that the operator reconciles to deploy the full Flux distribution

This avoids bootstrapping Flux with `flux bootstrap` and keeps the entire lifecycle GitOps-managed.

```
┌─────────────────────────────────────────────────────┐
│                   Git Repository                     │
│                  (RPCU/argus)                        │
└──────────────────────┬──────────────────────────────┘
                       │ sync (1m interval)
                       ▼
┌─────────────────────────────────────────────────────┐
│              Flux Operator (v0.40.0)                 │
│  One-time install via kustomize build | kubectl apply│
└──────────────────────┬──────────────────────────────┘
                       │ reconciles
                       ▼
┌─────────────────────────────────────────────────────┐
│               FluxInstance (Flux 2.x)                │
│  source-controller, kustomize-controller,            │
│  helm-controller, notification-controller            │
│  42 concurrent ops per controller                    │
└──────────────────────┬──────────────────────────────┘
                       │ watches
                       ▼
┌─────────────────────────────────────────────────────┐
│         Cluster-specific Kustomizations              │
│  (cert-manager, cilium, CAPI, yaook, etc.)           │
└─────────────────────────────────────────────────────┘
```

## Flux Operator

The operator is installed as a plain Kustomize remote base, pinned to a specific release:

```yaml
# infrastructure/fluxcd/operator/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://github.com/controlplaneio-fluxcd/flux-operator/releases/download/v0.40.0/install.yaml
```

Install command:

```bash
kustomize build infrastructure/fluxcd/operator/ | kubectl apply -f -
kubectl wait --for=condition=Available deployment/flux-operator -n flux-system --timeout=180s
```

## FluxInstance

The `FluxInstance` CRD tells the operator which Flux distribution to deploy and where to sync from:

```yaml
# infrastructure/fluxcd/instances/flux.yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: "ghcr.io/fluxcd"
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  cluster:
    type: kubernetes
    multitenant: false
    networkPolicy: true
    domain: "cluster.local"
  kustomize:
    patches:
      - target:
          kind: Deployment
          name: "(kustomize-controller|helm-controller)"
        patch: |
          - op: add
            path: /spec/template/spec/containers/0/args/-
            value: --concurrent=42
  sync:
    kind: GitRepository
    url: "https://github.com/RPCU/argus.git"
    ref: "refs/heads/main"
    path: "./clusters/PLACEHOLDER"
    interval: "1m"
```

Key settings:

| Field                  | Value                               | Purpose                             |
| ---------------------- | ----------------------------------- | ----------------------------------- |
| `distribution.version` | `2.x`                               | Flux v2 distribution                |
| `components`           | 4 controllers                       | Full Flux stack                     |
| `sync.url`             | `https://github.com/RPCU/argus.git` | Single Git source for all clusters  |
| `sync.path`            | `./clusters/PLACEHOLDER`            | Overridden per cluster              |
| `sync.interval`        | `1m`                                | Reconcile every minute              |
| `kustomize.patches`    | `--concurrent=42`                   | High parallelism for large clusters |

## Per-Cluster Overrides

Each cluster patches the base FluxInstance to set its own sync path and domain:

### Management Cluster

```yaml
# clusters/mgmt/fluxcd/flux-instance-patch.yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  cluster:
    domain: "mgmt.local"
  sync:
    path: "./clusters/mgmt"
```

### OpenStack Cluster

```yaml
# clusters/openstack/fluxcd/flux-instance-patch.yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  cluster:
    domain: "openstack.local"
  sync:
    path: "./clusters/openstack"
```

## Flux Components

| Controller                  | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| **source-controller**       | Fetches artifacts from Git, Helm repos, OCI registries    |
| **kustomize-controller**    | Reconciles `Kustomization` resources (kustomize overlays) |
| **helm-controller**         | Reconciles `HelmRelease` resources (Helm chart lifecycle) |
| **notification-controller** | Sends/receives alerts (GitHub commit status, Slack, etc.) |

## Kustomization vs HelmRelease

Flux provides two primary reconciliation primitives:

- **Kustomization** - For raw Kubernetes manifests, kustomize overlays, and remote bases. Used for: CAPI providers, ORC, external-snapshotter, cert-manager issuers, gateway-api CRDs.
- **HelmRelease** - For Helm chart lifecycle management. Used for: cert-manager, cilium, kgateway, rook, crossplane, yaook operators, CAPI operator, OCCM, Cinder CSI, external-dns.

## Dependency Ordering

Flux Kustomizations declare explicit `dependsOn` to enforce ordering:

```
flux-operator (no deps)
  └─> fluxcd (depends on flux-operator)
        └─> cert-manager (no deps)
              └─> cluster-api-operator (depends on cert-manager)
                    └─> cluster-api-providers (depends on cluster-api-operator + external-secrets)
                          └─> cluster-api-templates (depends on cluster-api-providers)
```

This ensures CRDs exist before resources that depend on them, and credentials are ready before components that need them.
