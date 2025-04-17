import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { ignores: ["build/*", "coverage/*", "**/dist/*", "types/*", "pnpm-lock.yaml", "pnpm-workspace.yaml"] },
  { languageOptions: { ecmaVersion: 2020, globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    rules: {
      "no-misleading-character-class": ["error", { allowEscape: true }],
      "@typescript-eslint/no-explicit-any": ["error", { fixToUnknown: true }],
    },
  },
]
