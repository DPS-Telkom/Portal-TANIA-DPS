import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Static export only (CLAUDE.md §1): server-only Next APIs are forbidden.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "next/headers", message: "TANIA adalah static export — tidak ada server." },
            { name: "next/server", message: "TANIA adalah static export — tidak ada server." },
            { name: "server-only", message: "TANIA adalah static export — tidak ada server." },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "supabase/functions/**",
    ],
  },
];

export default eslintConfig;
