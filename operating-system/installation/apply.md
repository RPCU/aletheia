# Deployment and Upgrades

This document describes the procedures for deploying system configurations and performing upgrades on existing hosts, covering both automatic and manual methods.

## Automatic Updates

Our systems are configured to self-update using **Ginx**, a lightweight Git-ops agent.

### How it Works

The `ginx` systemd service runs in the background and continuously monitors the infrastructure repository for changes.

1.  **Repository Monitoring:** Ginx checks the `main` branch of `https://github.com/rpcu/hephaestus` every 60 seconds.
2.  **Change Detection:** When a new commit is detected, Ginx triggers an update process.
3.  **Local Application:** It executes `colmena apply-local` directly on the machine to apply the new configuration.

This ensures that all fleet nodes converge to the latest configuration state automatically without manual intervention.

## Manual Updates

There are two primary methods to manually trigger an update or deploy a specific configuration.

### Remote Update (Colmena)

From your operator machine, you can push configurations to one or more targets using **Colmena**. This is the standard method for initial deployments or forcing updates from a development environment.

```bash
colmena apply
```

To target specific machines:
```bash
colmena apply --on <machine-name>
```

### Local Update (SSH)

If you are logged into a host via SSH, you can trigger an immediate update using the `osupdate` wrapper. This is useful for troubleshooting or applying changes when the automatic agent is paused.

1.  SSH into the target machine:
    ```bash
    ssh user@machine-address
    ```
2.  Execute the update command:
    ```bash
    osupdate
    ```

This command essentially performs the same action as the automatic agent, pulling the latest changes and applying the local configuration.