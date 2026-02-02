# User Management

This guide explains how to add and manage users within the infrastructure.

## Adding a New User

User management is declarative and handled through the `users/rpcu` directory in the [Hephaestus repository](https://github.com/RPCU/hephaestus).

### 1. Create User Directory

Create a directory for the new user under `users/rpcu/`. The directory name should match the desired username.

```bash
mkdir -p users/rpcu/<username>
```

### 2. Create User Configuration

Create a `default.nix` file inside the new user directory. This file will hold the user-specific configuration (e.g., shell preferences, dotfiles).

**File:** `users/rpcu/<username>/default.nix`

```nix
{ ... }:
{
  # Import additional configurations if needed
  # imports = [ ./git.nix ];
}
```

### 3. Register the User

Register the new user in the main user registry file `users/rpcu/default.nix`. You must use the `mkUser` helper function.

**File:** `users/rpcu/default.nix`

Add the following block to the `imports` list:

```nix
(mkUser {
  username = "<username>";
  userImports = [ ./<username> ];
  authorizedKeys = [
    "ssh-ed25519 AAAA..." # Paste the user's public SSH key here
  ];
})
```

### 4. Deploy

Commit your changes and deploy the configuration. The new user will be created across the fleet with the specified SSH access.
