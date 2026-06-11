import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'RPCU Documentation',
  description: 'Technical documentation for RPCU project',
  sitemap: {
    hostname: 'https://docs.rpcu.io',
    lastmodDateOnly: false,
  },
  lastUpdated: true,

  head: [['link', { rel: 'icon', href: '/logo.png' }]],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.png',
    search: {
      provider: 'local',
    },
    editLink: {
      pattern: 'https://github.com/rpcu/aletheia/tree/main/:path',
      text: 'Edit this page on GitHub',
    },

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Onboarding', link: '/onboarding/' },
      { text: 'Operating System', link: '/operating-system/' },
      { text: 'Kubernetes', link: '/kubernetes/' },
      { text: 'OpenStack', link: '/openstack/' },
      { text: 'GitOps', link: '/gitops/' },
      { text: 'Infrastructure Notes', link: '/infrastructure-notes' },
    ],

    sidebar: {
      '/': [
        {
          text: 'Introduction',
          items: [{ text: 'Welcome', link: '/introduction' }],
        },
        {
          text: 'Operator Onboarding',
          items: [{ text: 'Getting Started', link: '/onboarding/' }],
        },
        {
          text: 'Bootstrap',
          items: [
            {
              text: 'Cluster Bootstrap Guide',
              link: '/bootstrap/openstack/kubernetes',
            },
            {
              text: 'OpenStack Cluster Bootstrap',
              link: '/bootstrap/openstack-cluster',
            },
            {
              text: 'Management Cluster Bootstrap',
              link: '/bootstrap/management-cluster',
            },
          ],
        },
        {
          text: 'Operating System',
          items: [
            { text: 'Overview', link: '/operating-system/' },
            {
              text: 'Installation',
              items: [
                {
                  text: 'Build ISO',
                  link: '/operating-system/installation/build-iso',
                },
                {
                  text: 'Build QCOW2',
                  link: '/operating-system/installation/build-qcow2',
                },
                {
                  text: 'Deployment & Upgrades',
                  link: '/operating-system/installation/apply',
                },
                {
                  text: 'Test in a VM',
                  link: '/operating-system/installation/testing',
                },
              ],
            },
            { text: 'Customization', link: '/operating-system/customization' },
            { text: 'User Management', link: '/operating-system/users' },
            {
              text: 'Kubernetes',
              items: [
                {
                  text: 'Architecture',
                  link: '/operating-system/kubernetes/architecture',
                },
                {
                  text: 'Bootstrap Procedure',
                  link: '/operating-system/kubernetes/bootstrap',
                },
              ],
            },
          ],
        },
        {
          text: 'Kubernetes',
          items: [
            { text: 'Overview', link: '/kubernetes/' },
            {
              text: 'OpenStack Cluster',
              items: [
                { text: 'Architecture', link: '/operating-system/kubernetes/architecture' },
                { text: 'Bootstrap Procedure', link: '/operating-system/kubernetes/bootstrap' },
                { text: 'Adding a Node', link: '/openstack/adding-a-node' },
              ],
            },
            {
              text: 'Management Cluster',
              items: [
                { text: 'Overview', link: '/gitops/fluxcd/management-cluster' },
                { text: 'Bootstrap', link: '/bootstrap/management-cluster' },
                { text: 'CAPI Pivot', link: '/gitops/fluxcd/capi-pivot' },
              ],
            },
          ],
        },
        {
          text: 'OpenStack',
          items: [
            { text: 'Overview', link: '/openstack/' },
            { text: 'Adding a Node', link: '/openstack/adding-a-node' },
          ],
        },
        {
          text: 'GitOps',
          items: [
            { text: 'Overview', link: '/gitops/' },
            {
              text: 'FluxCD',
              items: [
                {
                  text: 'Overview',
                  link: '/gitops/fluxcd/overview',
                },
                {
                  text: 'Management Cluster',
                  link: '/gitops/fluxcd/management-cluster',
                },
                {
                  text: 'OpenStack Cluster',
                  link: '/gitops/fluxcd/openstack-cluster',
                },
                {
                  text: 'Cluster API Pivot',
                  link: '/gitops/fluxcd/capi-pivot',
                },
                {
                  text: 'Deploy Applications',
                  link: '/gitops/fluxcd/deploy-applications',
                },
              ],
            },
          ],
        },
        {
          text: 'Infrastructure Notes',
          items: [
            { text: 'Overview', link: '/infrastructure-notes' },
            { text: 'DNS Resolution', link: '/infrastructure-notes/dns-resolution' },
            { text: 'Cilium socketLB', link: '/infrastructure-notes/cilium-socketlb' },
            { text: 'Hetzner vSwitch', link: '/infrastructure-notes/hetzner-vswitch' },
            { text: 'VIP Failover', link: '/infrastructure-notes/vip-failover' },
            { text: 'Netbird VPN', link: '/infrastructure-notes/netbird-vpn' },
            { text: 'MTU Considerations', link: '/infrastructure-notes/mtu' },
            { text: 'NAT', link: '/infrastructure-notes/nat' },
            { text: 'OVN Bridge', link: '/infrastructure-notes/ovn-bridge' },
            { text: 'Cilium OVN Interface', link: '/infrastructure-notes/cilium-ovn-interface' },
            { text: 'Kernel Modules', link: '/infrastructure-notes/kernel-modules' },
            { text: 'Interface Naming', link: '/infrastructure-notes/interface-naming' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/rpcu' }],

    footer: {
      message: 'Open source infrastructure documentation',
      copyright: 'Copyright © 2026 RPCU Contributors',
    },
  },
})
