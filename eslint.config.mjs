import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactPlugin from "eslint-plugin-react";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.turbo/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
      "**/generated/**",
      "**/*.bak/**",
      "**/*.bak",
      "**/.venv/**",
      "libs/billing-access/**",
      "libs/billing-common/**",
      "libs/ts-rbac/src/**/*.js",
      "libs/ts-rbac/src/**/*.js.map",
      "libs/ts-rbac/src/**/*.d.ts",
      "libs/ts-rbac/src/**/*.d.ts.map",
      "libs/events/src/**/*.js",
      "libs/events/src/**/*.js.map",
      "libs/events/src/**/*.d.ts",
      "libs/events/src/**/*.d.ts.map",
      "**/tailwind.config.ts",
      "**/vitest.config.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
      "**/*.config.mjs",
      "**/*.config.js",
      "**/*.config.cjs",
      "**/next.config.js",
      "**/postcss.config.js",
      "**/docs/**",
      "**/tests/**",
      "**/e2e/**",
      "**/prisma/seed.ts",
      "scripts/validate-schemas.ts",
      "scripts/**"
    ]
  },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd()
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      import: importPlugin,
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      next: nextPlugin,
      "@next/next": nextPlugin
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: {
          project: true
        }
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Warn on undated task comments - use format: task(YYYY-MM-DD): message
      "no-warning-comments": [
        "warn",
        {
          "terms": ["TODO", "FIXME", "HACK", "XXX", "BUG"],
          "location": "start"
        }
      ],
      "import/order": [
        "warn",
        {
          "newlines-between": "always",
          "alphabetize": { order: "asc", caseInsensitive: true }
        }
      ],
      "import/no-unresolved": "off",
      "import/no-duplicates": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "lodash", message: "Use lodash-es or local helpers for treeshaking." }
          ],
          patterns: [
            {
              group: ["**/mock-data", "**/mock-data.ts", "**/lib/mock-data"],
              message: "Mock data imports are forbidden. Use real APIs via hooks from @/hooks."
            },
            {
              group: ["**/*.mock", "**/*.mock.ts"],
              message: "Mock file imports are forbidden in production code."
            }
          ]
        }
      ],
      "no-unused-vars": "off",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-floating-promises": ["warn", { ignoreVoid: true }],
      "@typescript-eslint/no-misused-promises": ["warn", { checksVoidReturn: false }],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "warn",
        { allowNumber: true, allowBoolean: true }
      ],
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/return-await": "off",
      "@typescript-eslint/no-namespace": ["warn", { allowDeclarations: true }],
      "@typescript-eslint/no-unnecessary-condition": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/restrict-plus-operands": "warn",
      "next/no-html-link-for-pages": "off",
      "react/no-array-index-key": "warn"
    }
  },
  {
    files: ["services/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },
  {
    // Services using compat tsconfig (strictNullChecks: false)
    files: [
      "services/auth-svc/**/*.{ts,tsx}",
      "services/billing-svc/**/*.{ts,tsx}",
      "services/benchmarking-svc/**/*.{ts,tsx}",
      "services/brain-orchestrator-svc/**/*.{ts,tsx}",
      "services/content-svc/**/*.{ts,tsx}",
      "services/edfi-svc/**/*.{ts,tsx}",
      "services/analytics-svc/**/*.{ts,tsx}",
      "services/assessment-svc/**/*.{ts,tsx}",
      "services/consent-svc/**/*.{ts,tsx}",
      "services/dsr-svc/**/*.{ts,tsx}",
      "services/gamification-svc/**/*.{ts,tsx}",
      "services/goal-svc/**/*.{ts,tsx}",
      "services/gradebook-svc/**/*.{ts,tsx}",
      "services/integration-svc/**/*.{ts,tsx}",
      "services/learner-model-svc/**/*.{ts,tsx}",
      "services/notify-svc/**/*.{ts,tsx}",
      "services/ai-orchestrator/**/*.{ts,tsx}",
      "services/api-gateway/**/*.{ts,tsx}",
      "services/focus-svc/**/*.{ts,tsx}",
      "services/lti-svc/**/*.{ts,tsx}",
      "services/parent-svc/**/*.{ts,tsx}",
      "services/profile-svc/**/*.{ts,tsx}",
      "services/realtime-svc/**/*.{ts,tsx}",
      "services/reports-svc/**/*.{ts,tsx}",
      "services/sandbox-svc/**/*.{ts,tsx}",
      "services/scorm-svc/**/*.{ts,tsx}",
      "services/session-svc/**/*.{ts,tsx}",
      "services/sync-svc/**/*.{ts,tsx}",
      "services/writing-pad-svc/**/*.{ts,tsx}",
      "packages/i18n/**/*.{ts,tsx}",
      "packages/caching/**/*.{ts,tsx}",
      "libs/ui-web/**/*.{ts,tsx}",
      "libs/events/**/*.{ts,tsx}"
    ],
    rules: {
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-confusing-void-expression": "off"
    }
  },
  {
    files: ["apps/**/*.{ts,tsx,js,jsx}"],
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off"
    }
  },
  {
    // Allow array index as key in controlled form inputs
    files: ["**/LessonGenerator.tsx"],
    rules: {
      "react/no-array-index-key": "off"
    }
  }
];
