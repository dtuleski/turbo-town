import { describe, expect, it } from 'vitest';

import en from '../en.json';
import es from '../es.json';
import pt from '../pt.json';

/**
 * The Circuit Builder teaches with words: component names, status lines, fault
 * titles and above all the four educational fault tooltips. i18n.ts sets
 * fallbackLng 'en', so a key missing from es.json or pt.json renders ENGLISH
 * silently instead of failing loudly. These tests are the gate that keeps the
 * three locales in step: every assertion is driven by en's key set, so any key
 * added to en's circuitBuilder block fails here until es and pt follow.
 */

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

/** Flattens an object to a map of dot-joined leaf path to leaf value. */
const flatten = (value: JsonObject, prefix = ''): Map<string, JsonValue> => {
  const leaves = new Map<string, JsonValue>();
  for (const [key, child] of Object.entries(value)) {
    const path = `${prefix}${key}`;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      for (const [nested, leaf] of flatten(child as JsonObject, `${path}.`)) {
        leaves.set(nested, leaf);
      }
    } else {
      leaves.set(path, child);
    }
  }
  return leaves;
};

const circuitBuilderOf = (locale: unknown): JsonObject => {
  const block = (locale as JsonObject).circuitBuilder;
  if (block === null || typeof block !== 'object' || Array.isArray(block)) {
    throw new Error('locale has no circuitBuilder block');
  }
  return block as JsonObject;
};

const EN = flatten(circuitBuilderOf(en));
const TRANSLATIONS = [
  ['es', flatten(circuitBuilderOf(es))],
  ['pt', flatten(circuitBuilderOf(pt))],
] as const;

/**
 * Keys where a translation that is byte-identical to English is genuinely
 * correct, so the copy-paste guard must not flag them:
 *  - component.led.name / component.motor.name: "LED" and "Motor" are the words
 *    used in Spanish and Brazilian Portuguese too, so a locale may legitimately
 *    land on the same string.
 *  - component.resistor.name: "Resistor" is exactly the term Brazilian school
 *    physics uses, so padding it only to look different would make the label
 *    worse for the reader the text is written for.
 *  - the eight component.*.abbr codes: short badge codes drawn from the same
 *    Latin roots (BAT/SOL/RES/LED/MOT...), so several coincide across locales.
 */
const IDENTICAL_ALLOWED: ReadonlySet<string> = new Set([
  'component.led.name',
  'component.motor.name',
  'component.resistor.name',
  'component.battery.abbr',
  'component.solar.abbr',
  'component.wire.abbr',
  'component.switch.abbr',
  'component.resistor.abbr',
  'component.led.abbr',
  'component.motor.abbr',
  'component.buzzer.abbr',
]);

describe('circuitBuilder locale completeness', () => {
  it('en declares a non-empty circuitBuilder block', () => {
    expect(EN.size).toBeGreaterThan(0);
  });

  for (const [name, translation] of TRANSLATIONS) {
    describe(name, () => {
      it('has exactly en key set, nothing missing', () => {
        const missing = [...EN.keys()].filter((key) => !translation.has(key));
        expect(missing).toEqual([]);
      });

      it('has exactly en key set, nothing extra', () => {
        const extra = [...translation.keys()].filter((key) => !EN.has(key));
        expect(extra).toEqual([]);
      });

      it('has the same leaf count as en', () => {
        expect(translation.size).toBe(EN.size);
      });

      it('has a non-empty, non-whitespace string for every key', () => {
        const bad = [...translation.entries()]
          .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
          .map(([key]) => key);
        expect(bad).toEqual([]);
      });

      it('leaves no value byte-identical to en outside the allow-list', () => {
        const copied = [...EN.entries()]
          .filter(([key, value]) => !IDENTICAL_ALLOWED.has(key) && translation.get(key) === value)
          .map(([key]) => key);
        expect(copied).toEqual([]);
      });
    });
  }

  it('keeps the {{count}} placeholder in tray.remaining in all three locales', () => {
    for (const [, translation] of [['en', EN] as const, ...TRANSLATIONS]) {
      expect(translation.get('tray.remaining')).toContain('{{count}}');
    }
  });

  it('pairs every en faultHelp key with a fault sibling', () => {
    const helpCodes = [...EN.keys()]
      .filter((key) => key.startsWith('faultHelp.'))
      .map((key) => key.slice('faultHelp.'.length));
    expect(helpCodes.length).toBeGreaterThan(0);
    const unpaired = helpCodes.filter((code) => !EN.has(`fault.${code}`));
    expect(unpaired).toEqual([]);
  });
});
