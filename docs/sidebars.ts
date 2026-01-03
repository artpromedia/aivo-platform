import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * AIVO Documentation Sidebars
 *
 * Organized by:
 * - Getting Started: Onboarding and quickstart
 * - Guides: How-to guides and tutorials
 * - API Reference: OpenAPI-generated docs
 * - Architecture: System design docs
 * - Security: Security and compliance
 * - Integrations: Third-party integrations
 */

const sidebars: SidebarsConfig = {
  guides: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/introduction',
        'getting-started/quickstart',
        'getting-started/authentication',
        'getting-started/making-requests',
        'getting-started/handling-errors',
        'getting-started/pagination',
        'getting-started/rate-limits',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'guides/core-concepts/lessons',
        'guides/core-concepts/courses',
        'guides/core-concepts/assessments',
        'guides/core-concepts/users-roles',
        'guides/core-concepts/progress-tracking',
        'guides/core-concepts/gamification',
        'guides/core-concepts/content-blocks',
      ],
    },
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/build-learning-app',
        'tutorials/create-interactive-lesson',
        'tutorials/implement-assessments',
        'tutorials/track-student-progress',
        'tutorials/build-leaderboard',
        'tutorials/integrate-analytics',
        'tutorials/implement-webhooks',
      ],
    },
    {
      type: 'category',
      label: 'Best Practices',
      items: [
        'guides/best-practices/api-design',
        'guides/best-practices/error-handling',
        'guides/best-practices/performance',
        'guides/best-practices/security',
        'guides/best-practices/testing',
      ],
    },
  ],

  api: [
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: [
        'api-reference/overview',
        {
          type: 'category',
          label: 'Authentication',
          items: [
            'api-reference/authentication/login',
            'api-reference/authentication/refresh',
            'api-reference/authentication/logout',
            'api-reference/authentication/oauth',
          ],
        },
        {
          type: 'category',
          label: 'Users',
          items: [
            'api-reference/users/list',
            'api-reference/users/get',
            'api-reference/users/create',
            'api-reference/users/update',
            'api-reference/users/delete',
            'api-reference/users/progress',
            'api-reference/users/achievements',
          ],
        },
        {
          type: 'category',
          label: 'Lessons',
          items: [
            'api-reference/lessons/list',
            'api-reference/lessons/get',
            'api-reference/lessons/create',
            'api-reference/lessons/update',
            'api-reference/lessons/delete',
            'api-reference/lessons/publish',
            'api-reference/lessons/start',
            'api-reference/lessons/complete',
          ],
        },
        {
          type: 'category',
          label: 'Courses',
          items: [
            'api-reference/courses/list',
            'api-reference/courses/get',
            'api-reference/courses/create',
            'api-reference/courses/update',
            'api-reference/courses/delete',
            'api-reference/courses/enroll',
          ],
        },
        {
          type: 'category',
          label: 'Assessments',
          items: [
            'api-reference/assessments/list',
            'api-reference/assessments/get',
            'api-reference/assessments/create',
            'api-reference/assessments/submit',
            'api-reference/assessments/results',
          ],
        },
        {
          type: 'category',
          label: 'Analytics',
          items: [
            'api-reference/analytics/learning',
            'api-reference/analytics/engagement',
            'api-reference/analytics/skills',
            'api-reference/analytics/export',
          ],
        },
        {
          type: 'category',
          label: 'Webhooks',
          items: [
            'api-reference/webhooks/list',
            'api-reference/webhooks/create',
            'api-reference/webhooks/update',
            'api-reference/webhooks/delete',
            'api-reference/webhooks/events',
          ],
        },
      ],
    },
  ],

  architecture: [
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/system-design',
        'architecture/data-model',
        'architecture/api-design',
        'architecture/microservices',
        'architecture/event-driven',
        'architecture/caching',
        'architecture/scalability',
      ],
    },
  ],

  security: [
    {
      type: 'category',
      label: 'Security',
      collapsed: false,
      items: [
        'security/overview',
        'security/authentication',
        'security/authorization',
        'security/encryption',
        'security/api-keys',
        'security/oauth-oidc',
        'security/audit-logging',
      ],
    },
    {
      type: 'category',
      label: 'Compliance',
      items: [
        'compliance/overview',
        'compliance/ferpa',
        'compliance/coppa',
        'compliance/gdpr',
        'compliance/accessibility',
        'compliance/data-retention',
      ],
    },
  ],

  integrations: [
    {
      type: 'category',
      label: 'LMS Integrations',
      items: [
        'integrations/lms/overview',
        'integrations/lms/canvas',
        'integrations/lms/blackboard',
        'integrations/lms/moodle',
        'integrations/lms/google-classroom',
        'integrations/lms/schoology',
        'integrations/lms/lti',
      ],
    },
    {
      type: 'category',
      label: 'SSO & Identity',
      items: [
        'integrations/sso/overview',
        'integrations/sso/saml',
        'integrations/sso/oidc',
        'integrations/sso/oauth2',
        'integrations/sso/clever',
        'integrations/sso/classlink',
        'integrations/sso/google',
        'integrations/sso/microsoft',
      ],
    },
    {
      type: 'category',
      label: 'Webhooks',
      items: [
        'integrations/webhooks/overview',
        'integrations/webhooks/setup',
        'integrations/webhooks/events',
        'integrations/webhooks/signatures',
        'integrations/webhooks/retries',
        'integrations/webhooks/testing',
      ],
    },
  ],
};

export default sidebars;
