# DNS Resolution for OpenStack VMs

## Problem

VMs on the external network need DNS resolution. By default, Neutron would hand out the baremetal cluster's CoreDNS IP (`10.0.0.241`) to child VMs via DHCP. However, this is a Kubernetes ClusterIP that's unreachable from the VM network — it only works inside the cluster. VMs trying to use it get no DNS resolution at all.

The gateway IP (`172.16.0.254`) would be the natural choice, but it's a keepalived VIP that floats between nodes, and nothing listens on it for DNS by default.

## Solution

Instead of giving VMs the unreachable CoreDNS IP, configure Neutron to use the gateway VIP (`172.16.0.254`) as the DNS server. Then deploy a host-level dnsmasq instance on each baremetal node that listens on `br-ex` and binds to the keepalived VIP. This creates a DNS proxy layer that bridges the VM network and the Kubernetes network, with split DNS forwarding:

- `/rpcu.lan/` → `10.0.0.241` (CoreDNS ClusterIP — Kubernetes internal DNS, Designate records)
- `/rpcu.vpn/` → `127.0.0.53` (host systemd-resolved)
- `/*` → `1.1.1.1` / `8.8.8.8` (public upstream)

This is a **separate instance** from Neutron's internal dnsmasq (which handles DHCP). The `no-dhcp-interface = "br-ex"` flag ensures it only serves DNS.

## Configuration

From `hephaestus/nixosModules/rpcuIaaSCP/osconfig.nix`:

```nix
dnsmasq = {
  enable = true;
  resolveLocalQueries = false; # don't replace systemd-resolved on the host
  settings = {
    interface = "br-ex";
    bind-dynamic = true;       # track keepalived VIP without restart
    no-resolv = true;          # don't read /etc/resolv.conf
    no-dhcp-interface = "br-ex"; # DNS only — Neutron handles DHCP
    server = [
      "/rpcu.lan/10.0.0.241"  # CoreDNS ClusterIP
      "/rpcu.vpn/127.0.0.53"  # host resolver
      "1.1.1.1"               # public upstream
      "8.8.8.8"
    ];
  };
};
```

From `argus/infrastructure/yaook/neutron.yaml` — Neutron tells VMs to use the gateway as DNS:

```yaml
neutronConfig:
  DEFAULT:
    dnsmasq_dns_servers:
      - 172.16.0.254
  ovn:
    dns_servers:
      - 172.16.0.254
```

## Resolution Chain

```
OpenStack VM
  │
  │  DHCP-assigned DNS: 172.16.0.254 (keepalived VIP)
  │
  ▼
dnsmasq (whichever node holds the VIP)
  │
  ├─ /rpcu.lan/* ──► CoreDNS 10.0.0.241 (Kubernetes / Designate)
  ├─ /rpcu.vpn/* ──► systemd-resolved (host)
  └─ /*          ──► 1.1.1.1 / 8.8.8.8 (public)
```

## Designate Integration

Designate provides authoritative DNS for the `rpcu.lan.` zone (backed by PowerDNS). ExternalDNS on the management cluster syncs Kubernetes resources (HTTPRoute, Ingress) into Designate using the [inovex webhook provider](https://github.com/inovex/external-dns-openstack-webhook). New services automatically get DNS records in `rpcu.lan.` when their HTTPRoute is created. This means VMs can resolve Kubernetes services by name — the dnsmasq proxy forwards `rpcu.lan` queries to CoreDNS, which in turn queries Designate for the actual records.
