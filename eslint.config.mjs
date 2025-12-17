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
      "libs/ts-rbac/src/**/*.js",
      "libs/ts-rbac/src/**/*.js.map",
      "libs/ts-rbac/src/**/*.d.ts",
      "libs/ts-rbac/src/**/*.d.ts.map",
      "**/tailwind.config.ts",
      "**/vitest.config.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
      "**/*.config.mjs",
      "**/tests/**",
      "**/prisma/seed.ts",
      "scripts/validate-schemas.ts"
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
      "next/no-html-link-for-pages": "off"
    }
  },
  {
    files: ["services/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },
  {
    files: ["apps/**/*.{ts,tsx,js,jsx}"],
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off"
    }
  }
];
