# System Customization

This guide explains how to customize the operating system configuration after the initial installation.

## Profile Management

System customization in [Hephaestus](https://github.com/RPCU/hephaestus) is managed through the `profiles` directory in the repository root. The system's identity and configuration are determined by its hostname.

**Note on Specialized Profiles:** While most profiles are for general system configurations, the `sunraku` profile is a dedicated exception, engineered to host our Netbird VPN server. Additionally, the `lucy`, `makise`, and `quinn` profiles are specifically assigned to form the baremetal Kubernetes cluster for OpenStack.

### Generic Profile Installation
When running the generated ISO in a fresh Virtual Machine, the system will automatically install the generic profile by default.

### Post-Installation Customization
To apply a different profile after initial installation:

1.  **Update Hostname:** Change the system hostname to match the desired target profile.
2.  **Apply Configuration:** Colmena uses the hostname to resolve and apply the corresponding profile configuration.
3.  **Validation:** Ensure strictly that the hostname matches the profile definition in the Hephaestus repository.
