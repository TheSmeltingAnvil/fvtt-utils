import pluginJs from "@eslint/js"
import { Linter } from "eslint"
import globals from "globals"
import tseslint from "typescript-eslint"

export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { ignores: ["build/*", "coverage/*", "**/dist/*", "types/*", "pnpm-lock.yaml", "pnpm-workspace.yaml"] },
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    rules: {
      "no-misleading-character-class": ["error", { allowEscape: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": ["error", { fixToUnknown: true }],
    },
  },
] satisfies Linter.Config[]
