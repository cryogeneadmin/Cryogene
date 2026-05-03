// Tier 2 codemod: replace bracketed hex Tailwind classes with @theme tokens.
//
// Only rewrites within Tailwind arbitrary-value brackets (e.g. `bg-[#0D1B3E]`
// → `bg-navy`). Inline style={{ color: "#XXX" }} is intentionally left alone
// — verified zero matches at codemod time (`grep style=\{\{...#[0-9A-F]{6}`).
//
// Tokens defined in app/globals.css @theme block.

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

// Canonical hex → token map. Hex keys are uppercased before lookup.
const TOKENS = {
  "#0D1B3E": "navy",
  "#162040": "mid-navy",
  "#2B4A8A": "blue",
  "#C0C8D8": "silver",
  "#FFFFFF": "white",
  "#F7F8FA": "offwhite",
  "#F1F3F6": "panel",
  "#6B7280": "muted",
  "#DDE1E7": "border",
  "#333333": "body-grey",
  "#FFF3CD": "compliance-amber-bg",
  "#6A4D00": "compliance-amber-text",
  "#E6C97A": "compliance-amber-border",
  "#DCFCE7": "success-bg",
  "#166534": "success-text",
  "#C8D4E4": "navy-text",
  "#AABBCC": "navy-text-dim",
  "#8BAAD4": "navy-icon",
  "#5B7BA3": "navy-label",
  // Orphans: collapse to closest existing token rather than minting one
  // for a single site. #F0F1F3 ≈ border (#DDE1E7) on neutral panels.
  "#F0F1F3": "border",
  // #9CA3AF maps to Tailwind's built-in gray-400 — handled in a second pass
  // below so we emit `gray-400` instead of a `@theme` token name.
};

const TAILWIND_DEFAULTS = {
  "#9CA3AF": "gray-400",
};

const ROOTS = ["app", "components"];
const EXTS = new Set([".tsx", ".ts"]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (EXTS.has(extname(full))) yield full;
  }
}

const summary = { files: 0, replacements: 0, byColor: {} };

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    let out = src;
    let changed = false;
    // Match Tailwind arbitrary value: anything-[#HEX] where HEX is 3 or 6 hex chars
    out = out.replace(
      /\[(#[0-9A-Fa-f]{3,8})\]/g,
      (match, hex) => {
        const upper = hex.toUpperCase();
        // Only rewrite 6-char hexes we have tokens for
        if (upper.length !== 7) return match;
        const token = TOKENS[upper] ?? TAILWIND_DEFAULTS[upper];
        if (!token) return match;
        summary.replacements++;
        summary.byColor[upper] = (summary.byColor[upper] ?? 0) + 1;
        changed = true;
        return token;
      }
    );
    if (changed) {
      writeFileSync(file, out);
      summary.files++;
    }
  }
}

console.log(`Files modified: ${summary.files}`);
console.log(`Replacements:   ${summary.replacements}`);
console.log("By colour:");
for (const [hex, n] of Object.entries(summary.byColor).sort((a, b) => b[1] - a[1])) {
  const dest = TOKENS[hex] ?? TAILWIND_DEFAULTS[hex] ?? "(unmapped)";
  console.log(`  ${hex} → ${dest}  ×${n}`);
}
