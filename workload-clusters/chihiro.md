# Chihiro UI

Chihiro is a lightweight web UI for creating and managing workload clusters. It gives users a form-based interface to provision clusters without writing YAML by hand. Chihiro lives on the management cluster and is accessible at `chihiro.mgmt.rpcu.lan`.

## How it works

![Chihiro UI](/chihiro-ui.png)

Chihiro reads a **Cluster template** (a Go-template for a CAPI `Cluster` CR) plus a set of **injections**, **parameters**, and **worker-group fields** from its config. The UI renders a form from these definitions, fills the template, and applies the resulting `Cluster` resource to the management cluster.

Configuration lives in **two places**:

| Surface                                                  | What it configures                                                                                                       | Where                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **`config.yaml`** (mounted from the `chihiro` ConfigMap) | The cluster template and the entire form: injections, parameters, worker-group schema, version list, limits, RBAC groups | `clusters/mgmt/apps/chihiro/cm.yaml`     |
| **Environment variables** (in the Deployment)            | Runtime wiring: OIDC, Redis/sessions, host/port, secrets, and overrides for some `config.yaml` keys                      | `clusters/mgmt/apps/chihiro/deploy.yaml` |

Every `config.yaml` key under `cluster:` can be edited live — Chihiro re-reads the ConfigMap on its next sync and the form updates immediately, **no code change or rebuild required**. Environment variables (below) override the matching `config.yaml` key when set, which is how secrets and per-environment values are injected.

## Configuring the form (`config.yaml`)

The whole form is driven by the `cluster:` block of `config.yaml`. The sections below cover each piece.

### Cluster template

`cluster.template` is the CAPI `Cluster` manifest Chihiro renders for each new cluster. It is a Go-template: any <span v-pre>`{{ chihiro.<name> }}`</span> token is filled from the matching **parameter** or a built-in (see below). The worker `machineDeployments` array is generated separately from the worker-group form and injected into the topology.

```yaml
cluster:
  template: |
    apiVersion: cluster.x-k8s.io/v1beta2
    kind: Cluster
    metadata:
      namespace: mgmt
    spec:
      clusterNetwork:
        pods:
          cidrBlocks:
            - {{'{{ chihiro.podCIDR }}'}}
        services:
          cidrBlocks:
            - {{'{{ chihiro.serviceCIDR }}'}}
      topology:
        classRef:
          name: openstack-kamaji
        version: "0.0.0"
```

**Built-in tokens** are always available in the template without declaring a parameter: <span v-pre>`{{ chihiro.name }}`</span>, `version`, `groups`, `serviceDomain`, and `controlPlaneReplicas`. These come from the core form fields.

### Injections — core `Cluster` fields

Injections map a path inside the rendered `Cluster` spec to one of Chihiro's built-in form fields. They control the label shown in the UI and whether the value can be edited **after** the cluster exists.

```yaml
cluster:
  injections:
    name:
      path: metadata.name
    version:
      path: spec.topology.version
      label: "Kubernetes Version"
      editable: true
    serviceDomain:
      path: spec.clusterNetwork.serviceDomain
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

| Key           | Meaning                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `path`        | Dot-path into the `Cluster` spec the value is written to/read from.     |
| `label`       | Field label shown in the form (defaults to a humanised key).            |
| `editable`    | `true` lets users change the value after creation. Defaults to `false`. |
| `min` / `max` | Bounds for numeric fields (e.g. control-plane replicas).                |

> Paths support array indices and quoted segments for keys containing dots/slashes, e.g. `spec.topology.variables[2].value` or `metadata.labels.'sveltos.argus.rpcu.io/cilium'`.

### Parameters — custom form fields

Parameters add form fields that are not core `Cluster` fields. Each one is exposed to the template as a <span v-pre>`{{ chihiro.<key> }}`</span> token. They support `string`, `number`, `boolean`, and `select` types.

```yaml
cluster:
  parameters:
    podCIDR:
      label: "Pod CIDR"
      description: "CIDR block for pod networking"
      type: string
      default: "10.207.0.0/16"

    # A select whose options are constrained by another field (the version):
    imageName:
      label: "Node Image"
      description: "OpenStack image for cluster nodes"
      type: select
      options:
        - value: "hephaestus-kaas-25.11-{{'{{ chihiro.version }}'}}"
          label: "25.11"
          constrain:
            version: ["v1.35.4"]
        - value: "hephaestus-kaas-26.05-{{'{{ chihiro.version }}'}}"
          label: "26.05"
          constrain:
            version: ["v1.36.1"]
      default: "hephaestus-kaas-26.05-{{'{{ chihiro.version }}'}}"
      editable: true
      path: "spec.topology.variables[2].value"

    # A boolean that toggles a Sveltos label, admin-only:
    oidcRbac:
      label: "OIDC RBAC"
      description: "Enable OIDC RBAC addon via Sveltos"
      type: boolean
      default: true
      true_value: enabled
      false_value: disabled
      editable: true
      path: "metadata.labels.'sveltos.argus.rpcu.io/oidc-rbac'"
      visible_groups:
        - kube-admin
```

| Key                          | Applies to      | Meaning                                                                                                                                                    |
| ---------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`                      | all             | Field label (defaults to a humanised key).                                                                                                                 |
| `description`                | all             | Help text shown under the field.                                                                                                                           |
| `type`                       | all             | `string` (default), `number`, `boolean`, or `select`.                                                                                                      |
| `default`                    | all             | Default value. May reference other parameters/built-ins via <span v-pre>`{{ chihiro.* }}`</span>.                                                          |
| `required`                   | all             | Marks the field required in the form.                                                                                                                      |
| `options`                    | `select`        | List of choices — plain strings, or `{ value, label, constrain }` objects.                                                                                 |
| `constrain`                  | `select` option | Maps another field → allowed values; the option is only offered when that field currently matches.                                                         |
| `true_value` / `false_value` | `boolean`       | Strings substituted into the template for on/off (default `"true"`/`"false"`).                                                                             |
| `editable`                   | all             | `true` lets the value be edited after creation. **Requires `path`.**                                                                                       |
| `path`                       | all             | Dot-path where the value is written when edited post-creation.                                                                                             |
| `recompute_on`               | all             | List of other fields whose change should re-resolve this parameter. Useful when a dependency can't be inferred from `constrain` metadata.                  |
| `implies`                    | all             | Declares fields this parameter pushes values to when edited. Each entry is `{field, source}` where `source` maps allowed values to the value written back. |
| `visible_groups`             | all             | OIDC groups allowed to see/edit the field in the form. Empty = everyone. Admins always see all fields.                                                     |

When `constrain` metadata is enough to express a dependency between fields,
Chihiro auto-detects it. For cases where the dependency cannot be inferred
from the option constraints, use `recompute_on` to declare it explicitly.
The `implies` field lets a parameter push values to other fields when edited.
See the README for full examples of both.

### Worker-group fields

Worker groups are heterogeneous: each cluster can have multiple machine-deployment pools, and the inputs for each pool are defined by `cluster.worker_group_fields`. The `cluster.worker_group_template` then maps those inputs into a `machineDeployment` entry using <span v-pre>`{{ chihiro.field.<key> }}`</span> tokens.

```yaml
cluster:
  worker_group_fields:
    name:
      label: "Group name"
      type: string
      required: true
      order: 0
    flavor:
      label: "Flavor"
      type: select
      options: [small, medium, xmedium, large, xlarge]
      default: xmedium
      order: 2
    replicas:
      label: "Replicas"
      type: number
      default: "1"
      min: 1
      max: 10
      order: 3

  worker_group_template: |
    name: {{'{{ chihiro.field.name }}'}}
    class: {{'{{ chihiro.field.class }}'}}
    replicas: {{'{{ chihiro.field.replicas }}'}}
    variables:
      overrides:
        - name: workerFlavor
          value: {{'{{ chihiro.field.flavor }}'}}
```

Each field supports `label`, `type` (`string` | `number` | `select`), `options`, `default`, `required`, `min`/`max`, `order` (display order), and `visible_groups`. **Allowed worker flavors are configured here** as the `flavor` field's `options` — not via an environment variable.

> If `worker_group_fields` / `worker_group_template` are omitted, Chihiro falls back to a built-in `name + class + flavor + replicas` schema so it works out of the box.

### Versions, limits, and RBAC groups

The remaining `cluster:` keys gate what users can pick and do:

```yaml
cluster:
  domain: "mgmt.rpcu.lan" # control-plane endpoint domain
  port: 443
  available_versions: # versions users can choose / upgrade to
    - "v1.36.1"
    - "v1.35.4"
  admin_groups: [kube-admin] # full admin access
  creator_groups: [kube-admin] # allowed to create clusters
  limits:
    max_clusters: 5 # across all Chihiro-managed clusters
    max_total_nodes: 10
    max_total_cp: 9
```

The `allowed_origins` key (also settable via `CHIHIRO_ALLOWED_ORIGINS`) is a
comma-separated list of full origin URLs trusted for OAuth redirect host
detection and WebSocket origin checks. The OIDC `redirect_url` host is always
implicitly trusted. Entries are validated by exact string match (no substring
or wildcard matching).

### Adding a new field — example

Adding a form field is a two-step edit to `clusters/mgmt/apps/chihiro/cm.yaml`:

**1. Declare a parameter:**

```yaml
cluster:
  parameters:
    newField:
      label: "New Field"
      description: "What this field controls"
      type: string
      default: "some-default"
```

**2. Reference it in the template:**

```yaml
cluster:
  template: |
    ...
    spec:
      someNewField: {{'{{ chihiro.newField }}'}}
```

Chihiro picks up the ConfigMap change on its next sync and renders the new field immediately.

### Previewing the rendered YAML

The create form has a **Preview YAML** button that renders the exact `Cluster` manifest that will be applied — with all parameters resolved and the IP range allocated — without creating anything. Use it to sanity-check a template or parameter change before committing to the cluster. The preview enforces the same permissions as creation, so it can't be used to bypass `creator_groups` or assign groups you don't belong to.

## Access

- **URL**: `chihiro.mgmt.rpcu.lan`
- **Authentication**: OIDC via the shared Zitadel instance (Authorization Code + PKCE)
- **Authorization**: `cluster.admin_groups` (e.g. `kube-admin`) → admin; `cluster.creator_groups` → may create clusters; everyone else → read-only

The OIDC application is managed by Crossplane (`clusters/mgmt/crossplane/zitadel/oidc-chihiro.yaml`). Client credentials are plumbed into the Deployment via External Secrets.

## Runtime configuration (environment variables)

Environment variables in the Deployment wire up secrets and runtime dependencies. Where an env var maps to a `config.yaml` key, **the env var wins when set** — this is how per-environment values and secrets are injected without editing the ConfigMap.

### Required

| Variable                     | Purpose                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `CHIHIRO_OIDC_ISSUER_URL`    | OIDC issuer (Zitadel) URL                                    |
| `CHIHIRO_OIDC_CLIENT_ID`     | OIDC client ID                                               |
| `CHIHIRO_OIDC_CLIENT_SECRET` | OIDC client secret (from External Secrets — never in config) |
| `CHIHIRO_SESSION_KEY`        | Session signing key, e.g. `openssl rand -base64 32`          |

### Cluster form / RBAC overrides

| Variable                     | Overrides `config.yaml` key      | Example           |
| ---------------------------- | -------------------------------- | ----------------- |
| `CHIHIRO_CLUSTER_DOMAIN`     | `cluster.domain`                 | `mgmt.rpcu.lan`   |
| `CHIHIRO_CLUSTER_PORT`       | `cluster.port`                   | `443`             |
| `CHIHIRO_ADMIN_GROUPS`       | `cluster.admin_groups`           | `kube-admin`      |
| `CHIHIRO_CREATOR_GROUPS`     | `cluster.creator_groups`         | `kube-admin`      |
| `CHIHIRO_AVAILABLE_VERSIONS` | `cluster.available_versions`     | `v1.36.1,v1.35.4` |
| `CHIHIRO_MAX_CLUSTERS`       | `cluster.limits.max_clusters`    | `5`               |
| `CHIHIRO_MAX_TOTAL_NODES`    | `cluster.limits.max_total_nodes` | `10`              |
| `CHIHIRO_MAX_TOTAL_CP`       | `cluster.limits.max_total_cp`    | `9`               |

> Comma-separated values (groups, versions) are split into lists.

### Server, Redis, and sessions

| Variable                  | Overrides             | Default                           |
| ------------------------- | --------------------- | --------------------------------- |
| `CHIHIRO_HOST`            | `host`                | `0.0.0.0`                         |
| `CHIHIRO_PORT`            | `port`                | `8080`                            |
| `CHIHIRO_REDIS_ADDR`      | `redis.addr`          | `localhost:6379`                  |
| `CHIHIRO_REDIS_USERNAME`  | `redis.username`      | `""`                              |
| `CHIHIRO_REDIS_PASSWORD`  | `redis.password`      | `""` (use a secret)               |
| `CHIHIRO_SESSION_TTL`     | `redis.session_ttl`   | `3600`                            |
| `CHIHIRO_SESSION_SECURE`  | `session.secure`      | auto (on for HTTPS redirect URLs) |
| `CHIHIRO_ALLOWED_ORIGINS` | `allowed_origins`     | —                                 |
| `CHIHIRO_DOCS_URL`        | `docs_url`            | —                                 |
| `CHIHIRO_DEBUG`           | enables debug logging | off                               |

## Source

Chihiro is deployed from [Argus](https://github.com/RPCU/argus) (`clusters/mgmt/apps/chihiro/`). It depends on cert-manager, kgateway, Dragonfly (Redis), External Secrets, and the Crossplane Zitadel resources.
