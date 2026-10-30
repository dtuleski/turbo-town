import { describe, expect, it } from 'vitest';

import { MARS_ROVER, listLevels } from '../../utils/circuitEngine';
import { GUIDED_DIFFICULTIES, listGuidedLevels } from '../../utils/circuitLevels';
import en from '../en.json';
import es from '../es.json';
import pt from '../pt.json';

/**
 * Extends (does not edit) localeCompleteness.test.ts: that file proves the three circuitBuilder
 * blocks have the same keys. This one proves the keys the guided game NEEDS exist, that
 * placeholders survive translation, and that the copy respects the numeric-disclosure tier of the
 * level it explains (FR-CB-34): no numbers at Easy, no units at Medium.
 */

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

const flatten = (value: JsonObject, prefix = ''): Map<string, string> => {
  const leaves = new Map<string, string>();
  for (const [key, child] of Object.entries(value)) {
    const path = `${prefix}${key}`;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      for (const [nested, leaf] of flatten(child as JsonObject, `${path}.`)) {
        leaves.set(nested, leaf);
      }
    } else {
      leaves.set(path, String(child));
    }
  }
  return leaves;
};

const blockOf = (locale: unknown): JsonObject => (locale as { circuitBuilder: JsonObject }).circuitBuilder;

const LOCALES = [
  ['en', flatten(blockOf(en))],
  ['es', flatten(blockOf(es))],
  ['pt', flatten(blockOf(pt))],
] as const;

const EN = LOCALES[0][1];

const FAULT_CODES = ['SHORT_CIRCUIT', 'OVERCURRENT', 'REVERSED_POLARITY', 'SINGULAR_SYSTEM'];

const placeholdersOf = (text: string): string[] =>
  [...text.matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g)].map((match) => match[1] ?? '').sort();

const DIGIT = /\d/;
const SYMBOL_UNIT = /Ω|\b(?:mA|V)\b/;
const WORD_UNIT = /\b(?:volts?|voltios?|ohms?|ohmios?|amps?|amperes?|amperios?|amp[èe]res?)\b/i;
const hasUnitToken = (text: string): boolean => SYMBOL_UNIT.test(text) || WORD_UNIT.test(text);

const COPY_FIELDS = ['title', 'goal', 'hint', 'learn'] as const;

describe('circuitBuilder guided-game copy', () => {
  const guided = listGuidedLevels();

  it('has the eight guided levels this copy is written for', () => {
    expect(guided.map((level) => level.id)).toHaveLength(8);
  });

  for (const [name, leaves] of LOCALES) {
    describe(name, () => {
      it('has title, goal, hint and learn for every guided level', () => {
        const missing: string[] = [];
        for (const level of guided) {
          for (const field of COPY_FIELDS) {
            const key = `level.${level.id}.${field}`;
            if ((leaves.get(key) ?? '').trim().length === 0) missing.push(key);
          }
        }
        expect(missing).toEqual([]);
      });

      it('has a presentation key for every Mars Rover role', () => {
        const missing = MARS_ROVER.roles
          .map((role) => role.presentationKey)
          .filter((key) => !key.startsWith('circuitBuilder.') || !leaves.has(key.slice('circuitBuilder.'.length)));
        expect(missing).toEqual([]);
      });

      it('has name, summary, disclosure and levels for every difficulty', () => {
        const missing: string[] = [];
        for (const difficulty of GUIDED_DIFFICULTIES) {
          for (const field of ['name', 'summary', 'disclosure', 'levels']) {
            const key = `difficulty.${String(difficulty)}.${field}`;
            if ((leaves.get(key) ?? '').trim().length === 0) missing.push(key);
          }
        }
        expect(missing).toEqual([]);
      });

      it('has a title and help line for every fault code', () => {
        const missing = FAULT_CODES.flatMap((code) => [`fault.${code}`, `faultHelp.${code}`]).filter(
          (key) => !leaves.has(key)
        );
        expect(missing).toEqual([]);
      });

      it('has every state and brightness word the readout can ask for', () => {
        const keys = [
          'readout.state.lit',
          'readout.state.dim',
          'readout.state.dark',
          'readout.state.spark',
          'readout.brightness.off',
          'readout.brightness.dim',
          'readout.brightness.medium',
          'readout.brightness.bright',
        ];
        expect(keys.filter((key) => !leaves.has(key))).toEqual([]);
      });

      it('gives no two guided levels the same title', () => {
        const titles = guided.map((level) => leaves.get(`level.${level.id}.title`));
        expect(new Set(titles).size).toBe(titles.length);
      });

      it('keeps the same placeholder set as en on every key', () => {
        const drifted: string[] = [];
        for (const [key, value] of EN) {
          if (placeholdersOf(value).join('|') !== placeholdersOf(leaves.get(key) ?? '').join('|')) {
            drifted.push(key);
          }
        }
        expect(drifted).toEqual([]);
      });

      it('keeps the count and n placeholders where the pages pass them', () => {
        for (const difficulty of GUIDED_DIFFICULTIES) {
          expect(leaves.get(`difficulty.${String(difficulty)}.levels`)).toContain('{{count}}');
        }
        expect(leaves.get('setup.levelNumber')).toContain('{{n}}');
      });

      it('shows no numbers and no units in Easy level copy', () => {
        const offenders: string[] = [];
        for (const level of guided.filter((item) => item.numericDisclosure === 'none')) {
          for (const field of ['goal', 'hint', 'learn'] as const) {
            const key = `level.${level.id}.${field}`;
            const text = leaves.get(key) ?? '';
            if (DIGIT.test(text) || hasUnitToken(text)) offenders.push(key);
          }
        }
        expect(offenders).toEqual([]);
      });

      it('shows no units in Medium level copy', () => {
        const offenders: string[] = [];
        for (const level of guided.filter((item) => item.numericDisclosure === 'qualitative')) {
          for (const field of ['goal', 'hint', 'learn'] as const) {
            const key = `level.${level.id}.${field}`;
            if (hasUnitToken(leaves.get(key) ?? '')) offenders.push(key);
          }
        }
        expect(offenders).toEqual([]);
      });
    });
  }

  it('covers every disclosure tier with at least one level, so the tier rules above are exercised', () => {
    const tiers = new Set(listLevels().map((level) => level.numericDisclosure));
    expect(tiers.has('none')).toBe(true);
    expect(tiers.has('qualitative')).toBe(true);
  });

  it('adds the same number of new circuitBuilder keys to every locale', () => {
    const sizes = LOCALES.map(([, leaves]) => leaves.size);
    expect(new Set(sizes).size).toBe(1);
  });
});
