import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The data layer is async (Turso / libSQL): a forgotten `await` would run a query
    // outside its transaction or swallow its error, so un-awaited promises are errors.
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts"],
    languageOptions: {
      parserOptions: {projectService: true, tsconfigRootDir: import.meta.dirname},
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", {checksVoidReturn: false}],
      "@typescript-eslint/await-thenable": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
