# Chihiro UI

Chihiro is a lightweight web UI for creating and managing workload clusters. It gives users a form-based interface to provision clusters without writing YAML by hand. Chihiro lives on the management cluster and is accessible at `chihiro.mgmt.rpcu.lan`.

## How it works

![Chihiro UI](/chihiro-ui.png)

Chihiro reads a **Cluster template** (a Go template for a CAPI `Cluster` CR) and a set of **injections** and **parameters** from its ConfigMap. The UI renders a form based on these definitions, fills in the template, and applies the resulting `Cluster` resource to the management cluster.

### Cluster fields (injections)

Injections pull values directly from an existing `Cluster` CR's spec. They are displayed in the UI as fields the user can inspect or edit.

From `clusters/mgmt/apps/chihiro/cm.yaml`:

```yaml
cluster:
  injections:
    name:
      path: metadata.name
    version:
      path: spec.topology.version
      label: "Kubernetes Version"
      editable: true
    groups:
      label: "Access Groups"
      editable: true
    workerGroups:
      path: spec.topology.workers.machineDeployments
      label: "Worker Groups"
      editable: true
    controlPlaneReplicas:
      path: spec.topology.controlPlane.replicas
      label: "Control Plane Replicas"
      editable: true
      min: 1
      max: 9
```

Each injection maps a JSON path inside the `Cluster` spec to a form field. Set `editable: true` to let users modify the value. Numeric fields support `min`/`max` constraints.

### Form parameters

Parameters define additional form fields that are not direct `Cluster` spec paths — they are injected into the Go template as <span v-pre>`{{'{{ chihiro.<name> }}'}}`</span> variables.

```yaml
cluster:
  parameters:
    podCIDR:
      label: "Pod CIDR"
      description: "CIDR block for pod networking"
      type: string
      default: "10.207.0.0/16"
    serviceCIDR:
      label: "Service CIDR"
      description: "CIDR block for service networking"
      type: string
      default: "10.107.0.0/16"
    imageName:
      label: "Node Image"
      description: "OpenStack image for cluster nodes"
      type: string
      default: "hephaestus-kaas-26.05-{{'{{ chihiro.version }}'}}"
```

Parameters support `string` and `boolean` types, with a `default` value (which can reference other parameters or injections via Go template syntax).

### Adding a new field

Adding a form field to Chihiro is a two-step edit to `clusters/mgmt/apps/chihiro/cm.yaml`:

**1. Add a parameter** (for a new template variable):

```yaml
parameters:
  newField:
    label: "New Field"
    description: "What this field controls"
    type: string
    default: "some-default"
```

**2. Reference it in the template**:

```yaml
template: |
  ...
  spec:
    someNewField: {{"{{ chihiro.newField }}"}}
```

That's it. Chihiro picks up the ConfigMap change on its next sync, and the form renders the new field immediately. No code changes, no rebuild — just a YAML edit and Flux reconciles it.

## Access

- **URL**: `chihiro.mgmt.rpcu.lan`
- **Authentication**: OIDC via the shared Zitadel instance (Authorization Code + PKCE)
- **Authorization**: `kube-admin` group → admin access, `kube-user` → viewer

The OIDC application is managed by Crossplane (`clusters/mgmt/crossplane/zitadel/oidc-chihiro.yaml`). Client credentials are plumbed into the Deployment via External Secrets.

## Configuration

Chihiro is configured through environment variables in the Deployment (`deploy.yaml`):

| Variable                     | Purpose                                | Example               |
| ---------------------------- | -------------------------------------- | --------------------- |
| `CHIHIRO_MAX_CLUSTERS`       | Maximum clusters a user can create     | `5`                   |
| `CHIHIRO_MAX_TOTAL_NODES`    | Total node limit across all clusters   | `10`                  |
| `CHIHIRO_MAX_TOTAL_CP`       | Total control-plane node limit         | `9`                   |
| `CHIHIRO_WORKER_FLAVORS`     | Allowed worker flavors                 | `small,medium,xlarge` |
| `CHIHIRO_AVAILABLE_VERSIONS` | Kubernetes versions users can pick     | `v1.36.1`             |
| `CHIHIRO_ADMIN_GROUPS`       | OIDC groups with admin access          | `kube-admin`          |
| `CHIHIRO_CREATOR_GROUPS`     | OIDC groups allowed to create clusters | `kube-admin`          |

## Source

Chihiro is deployed from [Argus](https://github.com/RPCU/argus) (`clusters/mgmt/apps/chihiro/`). It depends on cert-manager, kgateway, Dragonfly (Redis), External Secrets, and the Crossplane Zitadel resources.
