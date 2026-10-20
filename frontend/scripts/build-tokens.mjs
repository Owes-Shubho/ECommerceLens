// Generates src/styles/tokens.css from src/design-system/tokens.json (the design system's single source).
// Run: npm run tokens
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const t = JSON.parse(readFileSync(path.join(root, "src/design-system/tokens.json"), "utf8"));
const themes = t.color.themes.map((x) => x.id);
const first = themes[0];

const resolve = (v) => {
  const m = /^\{(.+)\}$/.exec(String(v).trim());
  return m ? `var(--${m[1]})` : v;
};
const valueFor = (tok, theme) =>
  typeof tok.value === "string" ? (theme === first ? tok.value : null) : tok.value[theme] ?? (theme === first ? tok.value[first] : null);

const themed = [...t.color.tokens, ...(t.shadow?.tokens ?? [])];
const block = (theme) =>
  themed
    .map((tok) => [tok.name, valueFor(tok, theme)])
    .filter(([, v]) => v != null)
    .map(([n, v]) => `  --${n}: ${resolve(v)};`)
    .join("\n");

const flat = ["spacing", "radius", "layout"]
  .flatMap((fam) => t[fam]?.tokens ?? [])
  .map((tok) => `  --${tok.name}: ${tok.value};`);
const fonts = Object.entries(t.type.families).map(([k, v]) => `  --font-${k}: ${v};`);

const dark = themes.includes("dark") ? block("dark") : "";
const css = `/* ${t.name} — generated from src/design-system/tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */

:root,
[data-theme="${first}"] {
${block(first)}
}
${dark ? `
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="${first}"]) {
${dark.replace(/^/gm, "  ")}
    color-scheme: dark;
  }
}

[data-theme="dark"] {
${dark}
  color-scheme: dark;
}
` : ""}
:root {
${[...flat, ...fonts].join("\n")}
}
`;
writeFileSync(path.join(root, "src/styles/tokens.css"), css);
console.log(`tokens.css written: ${themed.length} themed tokens, ${flat.length} scale tokens, ${fonts.length} font families`);
