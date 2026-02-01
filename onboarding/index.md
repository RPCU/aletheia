# Onboarding

Welcome to RPCU! This guide will help you get started with your first account and project.

## Prerequisites

Before you begin, you should have:
- [Netbird](https://netbird.io/) installed
- [Devbox](https://www.jetify.com/devbox) installed
- [Optional but recommended] [Direnv](https://direnv.net/) installed
- An access granted by an maintainer on the [RPCU GitHub organization](https://github.com/rpcu)
- An acccount created by a maintainer in the [Netbird instance](https://netbird.rpcu.io)
- SSH key pair for instance access.

## User profile on NixOS machines

You just need to follow [instructions here](https://github.com/RPCU/hephaestus?tab=readme-ov-file#--adding-a-user-to-the-team-rpcu)

::: tip
You can use any existing user config in [this path](https://github.com/RPCU/hephaestus/tree/main/users/rpcu) as an example
:::

## Netbird

When your account is ready and you have your credentials, you can run this command and follow instructions:
```sh
netbird up --management-url https://netbird.rpcu.io
```
Post login, you should see something like this in your web browser and terminal:

![img](/assets/netbird-login.png)

::: danger
We strongly recommend to change your password on the [Netbird portal](https://netbird.rpcu.io) !
You just need to click on your profile icon on the top right of your screen to see the "Change Password" option.
:::
