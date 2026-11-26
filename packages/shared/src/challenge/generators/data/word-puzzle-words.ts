/**
 * Medium Word Puzzle word lists, copied from `apps/web/src/utils/wordPuzzleUtils.ts`
 * (`WORD_LISTS_BY_LOCALE.<lang>.medium`). The challenge plays medium only. Keep in step with the web
 * when its medium lists change; duplicates are removed by the generator.
 */
import type { ChallengeLanguage } from '../../types';

export const WORD_PUZZLE_MEDIUM_WORDS: Readonly<Record<ChallengeLanguage, readonly string[]>> = {
  en: [
    'APPLE', 'BEACH', 'CLOUD', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HEART',
    'ISLAND', 'JUNGLE', 'KNIGHT', 'LEMON', 'MAGIC', 'NIGHT', 'OCEAN', 'PIANO',
    'QUEEN', 'RIVER', 'STORM', 'TIGER', 'URBAN', 'VOICE', 'WHALE', 'YOUTH',
    'BRAVE', 'CREAM', 'DRIFT', 'FROST', 'GLOBE', 'HONEY', 'IVORY', 'JEWEL',
    'MAPLE', 'NOBLE', 'OLIVE', 'PEARL', 'QUILT', 'ROBIN', 'SPINE', 'TORCH',
    'VAPOR', 'WAGON', 'CORAL', 'DELTA', 'EMBER', 'FLUTE', 'GRAIN', 'HIKER',
  ],
  es: [
    'PLAYA', 'NOCHE', 'FUEGO', 'TIGRE', 'VERDE', 'CIELO', 'MUNDO', 'PIANO',
    'ARENA', 'BOSQUE', 'CAMPO', 'DULCE', 'HIELO', 'JARDIN', 'LLUVIA', 'MUSICA',
    'REINA', 'NIEVE', 'SILLA', 'PLUMA', 'GLOBO', 'CORTE', 'TORRE', 'GRUPO',
    'BARCO', 'FRUTA', 'JUEGO', 'GRITO', 'HUEVO', 'LIBRO', 'MANGO', 'PERRO',
    'PIEDRA', 'QUESO', 'RELOJ', 'SOMBRA', 'TRIGO', 'UNICO', 'VALLE', 'ZORRO',
    'ABEJA', 'BRISA', 'CANTO', 'DANZA', 'ESPADA', 'FERIA', 'GLOBO', 'HORNO',
  ],
  pt: [
    'PRAIA', 'NOITE', 'NUVEM', 'TIGRE', 'VERDE', 'MUNDO', 'PIANO', 'SONHO',
    'AREIA', 'CAMPO', 'DOCE', 'GELO', 'JARDIM', 'CHUVA', 'MUSICA', 'OCEANO',
    'RAINHA', 'NEVE', 'CADEIRA', 'PLUMA', 'GLOBO', 'CORTE', 'TORRE', 'GRUPO',
    'BARCO', 'FRUTA', 'JOGO', 'GRITO', 'LIVRO', 'MANGA', 'PEDRA', 'QUEIJO',
    'BRISA', 'CANTO', 'DANCA', 'ESPADA', 'FESTA', 'FORNO', 'GRUTA', 'HEROI',
    'LEITE', 'MILHO', 'NOBRE', 'OLIVA', 'PEROLA', 'QUEDA', 'SOPRO', 'TOCHA',
  ],
};
