import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/build/**",
      "**/tmp/**",
      "**/data/**",
      "**/logs/**",
    ],
  },
  eslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
  },
  ...tseslint.configs.recommended,
);
