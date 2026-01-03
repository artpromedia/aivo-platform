import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type * as OpenApiPlugin from 'docusaurus-plugin-openapi-docs';

/**
 * AIVO Developer Documentation
 *
 * Comprehensive documentation portal with:
 * - API Reference from OpenAPI specs
 * - Guides and tutorials
 * - SDK documentation
 * - Interactive examples
 * - Full-text search
 * - Multi-language support
 * - Version management
 */

const config: Config = {
  title: 'AIVO Developer Docs',
  tagline: 'Build powerful educational experiences with the AIVO Platform',
  favicon: 'img/favicon.ico',

  url: 'https://developers.aivo.edu',
  baseUrl: '/',

  organizationName: 'aivo-platform',
  projectName: 'aivo-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko', 'ar'],
    localeConfigs: {
      en: { label: 'English', direction: 'ltr' },
      es: { label: 'Español', direction: 'ltr' },
      fr: { label: 'Français', direction: 'ltr' },
      de: { label: 'Deutsch', direction: 'ltr' },
      pt: { label: 'Português', direction: 'ltr' },
      zh: { label: '中文', direction: 'ltr' },
      ja: { label: '日本語', direction: 'ltr' },
      ko: { label: '한국어', direction: 'ltr' },
      ar: { label: 'العربية', direction: 'rtl' },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/artpromedia/aivo-platform/tree/main/docs/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          versions: {
            current: {
              label: 'v2.x (Current)',
              path: '',
            },
          },
          lastVersion: 'current',
          docItemComponent: '@theme/ApiItem',
        },
        blog: {
          path: 'changelog',
          routeBasePath: 'changelog',
          blogTitle: 'Changelog',
          blogDescription: 'AIVO Platform release notes and updates',
          blogSidebarTitle: 'Recent Updates',
          blogSidebarCount: 10,
          showReadingTime: false,
          feedOptions: {
            type: 'all',
            copyright: `Copyright © ${new Date().getFullYear()} AIVO Education`,
          },
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        gtag: {
          trackingID: 'G-XXXXXXXXXX',
          anonymizeIP: true,
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    // OpenAPI documentation
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'classic',
        config: {
          aivo: {
            specPath: 'openapi/aivo-api.yaml',
            outputDir: 'docs/api-reference',
            sidebarOptions: {
              groupPathsBy: 'tag',
              categoryLinkSource: 'tag',
            },
            version: '2.0.0',
            label: 'v2.0.0',
            baseUrl: '/api-reference',
            versions: {
              'v1.0.0': {
                specPath: 'openapi/v1/aivo-api.yaml',
                outputDir: 'docs/api-reference/v1',
                label: 'v1.0.0 (Legacy)',
                baseUrl: '/api-reference/v1',
              },
            },
          },
        } satisfies OpenApiPlugin.Options,
      },
    ],

    // SDK documentation
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'sdk',
        path: 'sdk-docs',
        routeBasePath: 'sdk',
        sidebarPath: './sidebars-sdk.ts',
      },
    ],

    // Ideal Image for optimized images
    [
      '@docusaurus/plugin-ideal-image',
      {
        quality: 85,
        max: 2000,
        min: 400,
        steps: 4,
        disableInDev: false,
      },
    ],

    // PWA support
    [
      '@docusaurus/plugin-pwa',
      {
        debug: process.env.NODE_ENV === 'development',
        offlineModeActivationStrategies: ['appInstalled', 'standalone', 'queryString'],
        pwaHead: [
          { tagName: 'link', rel: 'icon', href: '/img/logo.png' },
          { tagName: 'link', rel: 'manifest', href: '/manifest.json' },
          { tagName: 'meta', name: 'theme-color', content: '#6366f1' },
        ],
      },
    ],

    // Custom plugins
    './plugins/code-sandbox-plugin',
    './plugins/api-playground-plugin',
  ],

  themes: [
    'docusaurus-theme-openapi-docs',
    '@docusaurus/theme-live-codeblock',
    '@docusaurus/theme-mermaid',
  ],

  markdown: {
    mermaid: true,
  },

  themeConfig: {
    image: 'img/aivo-social-card.png',

    metadata: [
      { name: 'keywords', content: 'AIVO, API, SDK, education, learning, documentation' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],

    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },

    announcementBar: {
      id: 'v2_launch',
      content:
        '🚀 AIVO API v2 is now available! <a href="/changelog/v2-release">Learn about the new features</a>',
      backgroundColor: '#6366f1',
      textColor: '#ffffff',
      isCloseable: true,
    },

    navbar: {
      title: 'AIVO Developers',
      logo: {
        alt: 'AIVO Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guides',
          position: 'left',
          label: 'Guides',
        },
        {
          type: 'docSidebar',
          sidebarId: 'api',
          position: 'left',
          label: 'API Reference',
        },
        {
          to: '/sdk',
          label: 'SDKs',
          position: 'left',
        },
        {
          to: '/docs/integrations',
          label: 'Integrations',
          position: 'left',
        },
        {
          to: '/playground',
          label: 'API Playground',
          position: 'left',
        },
        {
          to: '/changelog',
          label: 'Changelog',
          position: 'right',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
          dropdownActiveClassDisabled: true,
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/artpromedia/aivo-platform',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'API Reference', to: '/docs/api-reference' },
            { label: 'SDKs', to: '/sdk' },
            { label: 'Tutorials', to: '/docs/tutorials' },
          ],
        },
        {
          title: 'Resources',
          items: [
            { label: 'API Status', href: 'https://status.aivo.edu' },
            { label: 'System Architecture', to: '/docs/architecture' },
            { label: 'Security', to: '/docs/security' },
            { label: 'Compliance', to: '/docs/compliance' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'Discord', href: 'https://discord.gg/aivo' },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/artpromedia/aivo-platform/discussions',
            },
            { label: 'Stack Overflow', href: 'https://stackoverflow.com/questions/tagged/aivo' },
            { label: 'Twitter', href: 'https://twitter.com/aivo_edu' },
          ],
        },
        {
          title: 'Company',
          items: [
            { label: 'About', href: 'https://aivo.edu/about' },
            { label: 'Blog', href: 'https://aivo.edu/blog' },
            { label: 'Careers', href: 'https://aivo.edu/careers' },
            { label: 'Contact', href: 'https://aivo.edu/contact' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AIVO Education, Inc. Built with Docusaurus.`,
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: [
        'bash',
        'json',
        'yaml',
        'typescript',
        'javascript',
        'python',
        'ruby',
        'php',
        'java',
        'csharp',
        'go',
        'swift',
        'kotlin',
        'dart',
        'http',
        'graphql',
      ],
      magicComments: [
        {
          className: 'theme-code-block-highlighted-line',
          line: 'highlight-next-line',
          block: { start: 'highlight-start', end: 'highlight-end' },
        },
        {
          className: 'code-block-error-line',
          line: 'error-next-line',
        },
        {
          className: 'code-block-success-line',
          line: 'success-next-line',
        },
      ],
    },

    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'aivo_docs',
      contextualSearch: true,
      searchParameters: {},
      searchPagePath: 'search',
    },

    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },

    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },

    liveCodeBlock: {
      playgroundPosition: 'bottom',
    },

    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
  } satisfies Preset.ThemeConfig,

  customFields: {
    apiBaseUrl: 'https://api.aivo.edu/v2',
    sandboxApiUrl: 'https://sandbox-api.aivo.edu/v2',
  },

  scripts: [
    {
      src: 'https://buttons.github.io/buttons.js',
      async: true,
      defer: true,
    },
  ],

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'AIVO Developer Documentation',
        url: 'https://developers.aivo.edu',
      }),
    },
  ],
};

export default config;
