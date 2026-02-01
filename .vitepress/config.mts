import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "RPCU Documentation",
  description: "Technical documentation for RPCU project",
  sitemap: {
    hostname: "https://docs.rpcu.io",
    lastmodDateOnly: false
  },
  lastUpdated: true,

  head: [
    ["link", { rel: "icon", href: "/assets/logo.png" }],
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/assets/logo.png",
    search: {
      provider: "local",
    },
    editLink: {
      pattern: "https://github.com/rpcu/aletheia/tree/main/:path",
      text: "Edit this page on GitHub",
    },

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Onboarding', link: '/onboarding/' },
      { text: 'Operating System', link: '/operating-system/' },
      { text: 'GitOps', link: '/gitops/' }
    ],

    sidebar: {
      '/': [
        {
          text: 'Intruction',
          items: [
            { text: 'Welcome', link: '/introduction' },
          ]
        },
        {
          text: 'Operator Onboarding',
          items: [
            { text: 'Getting Started', link: '/onboarding/' },
          ]
        },
        {
          text: 'Operating System',
          items: [
            { text: 'Overview', link: '/operating-system/' },
          ]
        },
        {
          text: 'GitOps',
          items: [
            { text: 'Overview', link: '/gitops/' },
            {
              text: 'FluxCD',
              items: [
                { text: 'Deploy Applications', link: '/gitops/fluxcd/deploy-applications' },
              ]
            },
          ]
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rpcu' }
    ],

    footer: {
      message: "Open source infrastructure documentation",
      copyright: "Copyright © 2026 RPCU Contributors",
    },
  }
})
