# DNS Resolution for OpenStack VMs

## Problem

VMs on the external network need DNS resolution. Neutron hands out a DNS server via DHCP, but the natural choice (the gateway IP `172.16.0.254`) is a keepalived VIP that floats between baremetal nodes. Nothing listens on that address for DNS by default — CoreDNS is inside Kubernetes (`10.0.0.241`), unreachable from the VM network without a proxy.

## Solution

A host-level dnsmasq instance runs on each baremetal node, listening on `br-ex`. It uses `bind-dynamic` to track the keepalived VIP without restarts, and provides split DNS forwarding:

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

Designate provides authoritative DNS for the `rpcu.lan.` zone (backed by PowerDNS). ExternalDNS on the management cluster syncs Kubernetes resources (HTTPRoute, Ingress) into Designate using the [inovex webhook provider](https://github.com/inovex/external-dns-openstack-webhook). New services automatically get DNS records in `rpcu.lan.` when their HTTPRoute is created.
