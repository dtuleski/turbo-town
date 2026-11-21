#!/usr/bin/env node
// Arrays of strings are flattened to indexed keys (name_0, name_1, ...).
// Converts apps/web/src/locales/{en,es,pt}.json (i18next) into lib/l10n/app_{en,es,pt}.arb.
// Keys are flattened (dots/hyphens -> underscores). i18next {{x}} becomes ICU {x}.
// Usage: node tools/convert_locales.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webLocales = join(here, '..', '..', 'web', 'src', 'locales');
const outDir = join(here, '..', 'lib', 'l10n');
const locales = ['en', 'es', 'pt'];
const reserved = new Set([
  'abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch', 'class', 'const',
  'continue', 'default', 'do', 'else', 'enum', 'extends', 'false', 'final', 'finally', 'for',
  'if', 'in', 'is', 'new', 'null', 'rethrow', 'return', 'super', 'switch', 'this', 'throw',
  'true', 'try', 'var', 'void', 'while', 'with', 'yield',
]);

function flatten(obj, prefix, out, locale) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object') {
      // Objects recurse; arrays become indexed keys (features.0 -> features_0).
      flatten(v, path, out, locale);
    } else if (typeof v === 'string') {
      // i18next plurals are suffixes on the last segment (title_one). Nested ".other" is a normal key.
      if (/_(zero|one|two|few|many|other)$/.test(k)) {
        throw new Error(`[${locale}] plural key "${path}" is not supported yet`);
      }
      const key = path.replace(/[.\-]/g, '_');
      if (!/^[a-z][A-Za-z0-9_]*$/.test(key) || reserved.has(key)) {
        throw new Error(`[${locale}] key "${path}" -> "${key}" is not a valid ARB/Dart identifier`);
      }
      if (key in out) throw new Error(`[${locale}] key collision on "${key}" (from "${path}")`);
      out[key] = v;
    } else {
      throw new Error(`[${locale}] unsupported value at "${path}" (${typeof v})`);
    }
  }
}

function convertMessage(value, locale, key) {
  if (/\$t\(/.test(value)) throw new Error(`[${locale}] nesting in "${key}" is not supported`);
  const placeholders = [];
  // Protect placeholders, escape ICU specials, then restore as {name}.
  let out = value.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (_, name) => {
    if (!placeholders.includes(name)) placeholders.push(name);
    return `\u0000${name}\u0001`;
  });
  out = out.replace(/'/g, "''").replace(/\{/g, "'{'").replace(/\}/g, "'}'");
  out = out.replace(/\u0000([A-Za-z0-9_]+)\u0001/g, '{$1}');
  return { message: out, placeholders };
}

mkdirSync(outDir, { recursive: true });
const counts = {};
const flats = {};
for (const locale of locales) {
  const src = JSON.parse(readFileSync(join(webLocales, `${locale}.json`), 'utf8'));
  flats[locale] = {};
  flatten(src, '', flats[locale], locale);
}
// Mirror i18next fallbackLng 'en': keys missing from es/pt are filled from en so the mobile
// locales always have identical key sets. Filled keys are listed so translators can follow up.
for (const locale of locales.filter((l) => l !== 'en')) {
  const missing = Object.keys(flats.en).filter((k) => !(k in flats[locale]));
  for (const k of missing) flats[locale][k] = flats.en[k];
  if (missing.length) console.log(`[${locale}] filled from en (missing on web): ${missing.join(', ')}`);
  const extra = Object.keys(flats[locale]).filter((k) => !(k in flats.en));
  if (extra.length) throw new Error(`[${locale}] keys not in en: ${extra.join(', ')}`);
}
for (const locale of locales) {
  const flat = flats[locale];
  const arb = { '@@locale': locale };
  for (const [key, value] of Object.entries(flat)) {
    const { message, placeholders } = convertMessage(value, locale, key);
    arb[key] = message;
    if (placeholders.length) {
      arb[`@${key}`] = {
        placeholders: Object.fromEntries(placeholders.map((p) => [p, { type: 'String' }])),
      };
    }
  }
  writeFileSync(join(outDir, `app_${locale}.arb`), JSON.stringify(arb, null, 2) + '\n');
  counts[locale] = Object.keys(flat).length;
}
console.log('Converted keys:', counts);
