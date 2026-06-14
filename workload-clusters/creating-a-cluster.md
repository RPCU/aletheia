# Creating a Cluster

Apply a small `Cluster` CR referencing either `openstack-default` or `openstack-kamaji`. Set labels to opt into Sveltos-managed add-ons. Templates live in [Argus](https://github.com/RPCU/argus) (`infrastructure/cluster-api-templates/`). The Kamaji provider itself is deployed on the management cluster via `clusters/mgmt/kamaji.yaml`.

```yaml
apiVersion: cluster.x-k8s.io/v1beta2
kind: Cluster
metadata:
  name: my-cluster
  namespace: mgmt
  labels:
    type: workload
    sveltos.argus.rpcu.io/cilium: enabled
    sveltos.argus.rpcu.io/oidc-rbac: enabled
spec:
  clusterNetwork:
    pods:
      cidrBlocks: ["10.244.0.0/16"]
    serviceDomain: cluster.local
  topology:
    classRef:
      name: openstack-kamaji # or openstack-default
    version: v1.35.4
    controlPlane:
      replicas: 3
    workers:
      machineDeployments:
        - class: default-worker
          name: md-0
          replicas: 3
    variables:
      - name: identityRef
        value: { name: my-cloud-config, cloudName: openstack }
      - name: externalNetworkId
        value: <external-network-uuid>
      - name: imageName
        value: hephaestus-kaas-25.11-v1.35.4
```
