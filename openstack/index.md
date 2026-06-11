# OpenStack

RPCU runs a full OpenStack cloud, deployed and operated declaratively on top of the baremetal Kubernetes cluster via [Yaook](https://yaook.cloud/) operators.

## Overview

The OpenStack control plane (Keystone, Glance, Nova, Neutron/OVN, Cinder, Octavia, Designate, Barbican, Horizon) runs as Kubernetes workloads on the `openstack` cluster. Everything is described as code in the [Argus](https://github.com/RPCU/argus) GitOps repository and reconciled by FluxCD — there is effectively no click-ops.

For the cluster topology, networking, storage, and service routing, see [GitOps → OpenStack Cluster](../gitops/fluxcd/openstack-cluster.md).

## Operations

- [Adding a Node](./adding-a-node.md) — grow compute/OVN capacity by joining a node to the cluster and labelling it.
