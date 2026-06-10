# Deployment and Upgrades

This document describes the procedures for deploying system configurations and performing upgrades on existing hosts.

## Automatic Updates (Ginx)

All RPCU nodes are configured to self-update using **Ginx**, a lightweight Git-ops agent.

### How it Works

The `ginx` systemd service runs in the background and monitors the [Hephaestus repository](https://github.com/RPCU/hephaestus) for changes:

1. **Repository Monitoring:** Ginx checks the `main` branch every 60 seconds
2. **Change Detection:** When a new commit is detected, Ginx triggers an update
3. **Local Application:** It executes `colmena apply-local` directly on the machine

This ensures all fleet nodes converge to the latest configuration state automatically.

### Ginx Configuration

Ginx is enabled via the `customNixOSModules.ginx` NixOS module:

```nix
customNixOSModules.ginx = {
  enable = true;                                    # Enable the agent
  repositoryUrl = "https://github.com/RPCU/hephaestus";  # Repo to watch
  repositoryBranch = "main";                        # Branch to track
};
```

The service runs as a systemd unit with `restartIfChanged = false` and `stopIfChanged = false` — it survives configuration changes and reboots.

### Manual One-Shot Update

To force an immediate update (pull latest and apply):

```bash
osupdate
```

This shows the current applied revision, fetches the latest from GitHub, and runs `colmena apply-local`.

## Remote Deployment (Colmena)

From your operator machine, push configurations to one or more targets using **Colmena**:

```bash
# Deploy to all nodes
colmena apply

# Deploy to a specific node
colmena apply --on lucy
```

Colmena uses `buildOnTarget = true` in `hive.nix`, meaning each node builds its own configuration locally rather than cross-compiling on the operator machine.

### Deployment Topology

From `hive.nix`:

| Node    | Target Host | Tags            | Build Strategy |
| ------- | ----------- | --------------- | -------------- |
| lucy    | `lucy`      | rpcu, baremetal | buildOnTarget  |
| makise  | `makise`    | rpcu, baremetal | buildOnTarget  |
| quinn   | `quinn`     | rpcu, baremetal | buildOnTarget  |
| sunraku | `sunraku`   | rpcu, vps       | buildOnTarget  |

### What Colmena Applies

Each node's configuration is defined by its profile under `profiles/<hostname>/`. The profile imports `base.nix` which brings in:

- System packages (kubectl, cilium-cli, curl, tcpdump, etc.)
- NixOS modules (ginx, kubernetes, vlan, chrony, sysctl)
- Kubernetes configuration (on lucy/makise/quinn)
- User accounts and SSH keys

After applying, Colmena activates the new generation and restarts affected services.

## Local Update (SSH)

If you're logged into a host via SSH, trigger an update directly:

```bash
ssh user@lucy
osupdate
```

This is useful for troubleshooting or applying changes when the automatic agent is paused.

## Verification

After any deployment method, verify the node is in the expected state:

```bash
# Check current NixOS generation
sudo nixos-rebuild list-generations

# Check the applied Git revision
cat /etc/nixos/version | jq .rev

# Check ginx is running
systemctl status ginx

# Check Kubernetes (on K8s nodes)
kubectl get nodes
```

## Rollback

NixOS preserves every generation. To roll back to the previous configuration:

```bash
sudo nixos-rebuild switch --rollback
```
