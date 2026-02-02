# Bootstrap Procedure

This guide details the process for bootstrapping the Kubernetes cluster using the automated tooling provided by the operating system.

## Prerequisites

-   Access to the `lucy` node (the designated bootstrap node).
-   Root privileges (via `sudo`).

## Bootstrapping the First Node (Lucy)

The `lucy` profile includes a specialized helper script `initKubeadm` that automates the initialization process.

1.  **SSH into Lucy:**
    ```bash
    ssh user@lucy
    ```

2.  **Run the Initialization:**
    ```bash
    sudo initKubeadm
    ```

### What this script does:
1.  **Deploys kube-vip:** Installs the static pods required for the High Availability VIP.
2.  **Initializes Cluster:** Runs `kubeadm init` using the pre-generated config at `/etc/kubernetes/kubeadm/bootstrap.yaml`.
3.  **Configures Access:** Sets up `kubectl` for the root user and the calling user.
4.  **Generates Join Tokens:** Extracts and displays the command needed to join the other control plane nodes.

## Joining Other Nodes (Makise & Quinn)

After `initKubeadm` completes successfully on `lucy`, it will output a command in the following format:

```bash
joinCPKubeadm <TOKEN> <CERT_KEY>
```

1.  **Copy the Command:** Take the `joinCPKubeadm ...` command output by the script.
2.  **Run on Other Nodes:** SSH into `makise` and `quinn` and execute the command.

```bash
# On makise and quinn
sudo joinCPKubeadm <TOKEN> <CERT_KEY>
```

This will join them to the cluster as high-availability control plane replicas.
