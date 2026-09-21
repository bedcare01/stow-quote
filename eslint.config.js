import js from "@eslint/js";
import tseslint from "typescript-eslint";
export default tseslint.config({ignores:["build/**",".react-router/**","node_modules/**"]},js.configs.recommended,...tseslint.configs.recommended,{languageOptions:{globals:{process:"readonly",Buffer:"readonly",fetch:"readonly",console:"readonly",setTimeout:"readonly"}},rules:{"@typescript-eslint/no-explicit-any":"off","@typescript-eslint/no-unused-vars":["error",{argsIgnorePattern:"^_"}]}});
