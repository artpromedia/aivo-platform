import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * SDK Documentation Sidebars
 */

const sidebars: SidebarsConfig = {
  sdk: [
    {
      type: 'doc',
      id: 'index',
      label: 'SDK Overview',
    },
    {
      type: 'category',
      label: 'JavaScript',
      collapsed: false,
      items: [
        'javascript/index',
        'javascript/installation',
        'javascript/authentication',
        'javascript/lessons',
        'javascript/courses',
        'javascript/users',
        'javascript/assessments',
        'javascript/analytics',
        'javascript/webhooks',
        'javascript/error-handling',
        'javascript/typescript',
        'javascript/react',
        'javascript/nextjs',
        'javascript/testing',
      ],
    },
    {
      type: 'category',
      label: 'Python',
      items: [
        'python/index',
        'python/installation',
        'python/authentication',
        'python/lessons',
        'python/courses',
        'python/users',
        'python/async',
        'python/error-handling',
        'python/django',
        'python/flask',
        'python/testing',
      ],
    },
    {
      type: 'category',
      label: 'Ruby',
      items: [
        'ruby/index',
        'ruby/installation',
        'ruby/authentication',
        'ruby/resources',
        'ruby/error-handling',
        'ruby/rails',
        'ruby/testing',
      ],
    },
    {
      type: 'category',
      label: 'PHP',
      items: [
        'php/index',
        'php/installation',
        'php/authentication',
        'php/resources',
        'php/error-handling',
        'php/laravel',
        'php/testing',
      ],
    },
    {
      type: 'category',
      label: 'Java',
      items: [
        'java/index',
        'java/installation',
        'java/authentication',
        'java/resources',
        'java/error-handling',
        'java/spring-boot',
        'java/testing',
      ],
    },
    {
      type: 'category',
      label: '.NET',
      items: [
        'dotnet/index',
        'dotnet/installation',
        'dotnet/authentication',
        'dotnet/resources',
        'dotnet/error-handling',
        'dotnet/aspnet',
        'dotnet/testing',
      ],
    },
  ],
};

export default sidebars;
