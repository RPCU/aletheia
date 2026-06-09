# Deploy Applications

How to deploy new applications and infrastructure components to RPCU clusters via Flux.

## Adding a New Component

### 1. Create the infrastructure manifests

Add your component files under `infrastructure/<component-name>/`:

```
infrastructure/
└── my-component/
    ├── kustomization.yaml    # Kustomize entrypoint
    ├── helmrelease.yaml      # (if Helm chart) HelmRelease
    ├── helmrepo.yaml         # (if Helm chart) HelmRepository
    └── values.yaml           # (if Helm chart) custom values
```

For a Helm-based component:

```yaml
# infrastructure/my-component/helmrepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-component
  namespace: flux-system
spec:
  interval: 24h
  url: https://my-chart-repo.example.com
```

```yaml
# infrastructure/my-component/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-component
  namespace: my-component
spec:
  interval: 5m
  chart:
    spec:
      chart: my-component
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-component
        namespace: flux-system
  values:
    # custom values here
```

```yaml
# infrastructure/my-component/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helmrepo.yaml
  - helmrelease.yaml
```

### 2. Add the Flux Kustomization wrapper

Create a Flux Kustomization resource that references your infrastructure:

```yaml
# clusters/<target>/my-component.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-component
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/my-component
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux
  dependsOn:
    - name: cert-manager # if your component depends on cert-manager
```

### 3. Add to the cluster's kustomization.yaml

Add your new file to `clusters/<target>/kustomization.yaml`:

```yaml
resources:
  - cert-manager.yaml
  - cilium.yaml
  - my-component.yaml # <-- add here
  - ...
```

### 4. Verify

After committing and pushing, Flux will reconcile your new component:

```bash
# Check Flux picked up the change
kubectl get kustomization -n flux-system my-component

# Check the component is running
kubectl get pods -n my-component
```

## Deploying to Both Clusters

If a component is shared between clusters:

1. Place the infrastructure manifests in `infrastructure/<component>/` (shared base)
2. Create separate Flux Kustomization wrappers in each cluster directory
3. Add cluster-specific patches as needed (e.g., different values for mgmt vs openstack)

Example with cluster-specific patches:

```yaml
# clusters/mgmt/my-component.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-component
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/my-component
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux
  patches:
    - target:
        kind: HelmRelease
        name: my-component
      patch: |
        - op: replace
          path: /spec/values/someKey
          value: mgmt-specific-value
```

## Dependency Ordering

Use `dependsOn` to enforce component ordering:

```yaml
spec:
  dependsOn:
    - name: cert-manager # CRDs must exist first
    - name: external-secrets # credentials must be ready
```

::: warning
Avoid circular dependencies. Use `wait: false` for Kustomizations that depend on manually-created secrets — they cannot become Ready until the secret exists, but should not block other components.
:::

## Useful Commands

```bash
# List all Kustomizations
kubectl get kustomization -n flux-system

# Check reconciliation status
kubectl describe kustomization -n flux-system my-component

# Force reconciliation
flux reconcile kustomization my-component -n flux-system

# Check HelmRelease status
kubectl get helmrelease -A

# View Helm release history
helm history my-component -n my-component
```
