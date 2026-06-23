import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

// QLSS — flat ESLint config (Next.js 16 + TypeScript + React)
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "public/**",
      "dist/**",
      "build/**",
      "mini-services/**",
      "examples/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // react-hooks v6 introduced very strict rules that flag legitimate
      // mount-time setState (cookie sync, viewport measurement) and purity
      // checks across the existing shadcn UI kit. Relax them to keep the
      // codebase lint-clean without a large refactor.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "prefer-const": "warn",
      // These JS runtime rules are noisy / already covered by TypeScript:
      "no-undef": "off",
      "no-dupe-keys": "off",
      "no-useless-escape": "off",
      "no-irregular-whitespace": "off",
      "no-misleading-character-class": "off",
      "no-constant-condition": "off",
      "no-inner-declarations": "off",
    },
  },
);
