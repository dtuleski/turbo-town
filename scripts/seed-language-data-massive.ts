#!/usr/bin/env ts-node

/**
 * Massive Language Learning Data Seed Script
 * 
 * Populates ALL categories (animals, food, colors, numbers, objects, nature)
 * across ALL difficulty levels (beginner, intermediate, advanced)
 * with high-quality Unsplash images and 7-language translations.
 * 
 * Total: ~120 words (20 per category × 6 categories)
 * Each word has: correct image + 2 distractor images from same category
 * 
 * Usage: npx ts-node scripts/seed-language-data-massive.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.LANGUAGE_WORDS_TABLE_NAME || 'memory-game-language-words-dev';

interface WordEntry {
  category: string;
  difficulty: string;
  languageCode: string;
  translations: Record<string, { word: string; pronunciation: string }>;
  imageUrl: string;
  distractorImages: string[];
}

// ============================================================
// UNSPLASH IMAGE POOLS PER CATEGORY (for cross-referencing distractors)
// ============================================================

const VOCABULARY_DATA: WordEntry[] = [
  // ============================================================
  // 🐕 ANIMALS - BEGINNER (8 words)
  // ============================================================
  {
    category: 'animals', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'dog', pronunciation: '/dɔːɡ/' },
      es: { word: 'perro', pronunciation: '/ˈpe.ro/' },
      fr: { word: 'chien', pronunciation: '/ʃjɛ̃/' },
      it: { word: 'cane', pronunciation: '/ˈka.ne/' },
      de: { word: 'Hund', pronunciation: '/hʊnt/' },
      pt: { word: 'cão', pronunciation: '/ˈkɐ̃w̃/' },
      el: { word: 'σκύλος', pronunciation: '/ˈsci.los/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'cat', pronunciation: '/kæt/' },
      es: { word: 'gato', pronunciation: '/ˈɡa.to/' },
      fr: { word: 'chat', pronunciation: '/ʃa/' },
      it: { word: 'gatto', pronunciation: '/ˈɡat.to/' },
      de: { word: 'Katze', pronunciation: '/ˈkat.sə/' },
      pt: { word: 'gato', pronunciation: '/ˈɡa.tu/' },
      el: { word: 'γάτα', pronunciation: '/ˈɣa.ta/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1425082661507-6af0db74ab56?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'bird', pronunciation: '/bɜːrd/' },
      es: { word: 'pájaro', pronunciation: '/ˈpa.xa.ro/' },
      fr: { word: 'oiseau', pronunciation: '/wa.zo/' },
      it: { word: 'uccello', pronunciation: '/ut.ˈtʃel.lo/' },
      de: { word: 'Vogel', pronunciation: '/ˈfoː.ɡəl/' },
      pt: { word: 'pássaro', pronunciation: '/ˈpa.sa.ru/' },
      el: { word: 'πουλί', pronunciation: '/pu.ˈli/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'fish', pronunciation: '/fɪʃ/' },
      es: { word: 'pez', pronunciation: '/peθ/' },
      fr: { word: 'poisson', pronunciation: '/pwa.sɔ̃/' },
      it: { word: 'pesce', pronunciation: '/ˈpe.ʃe/' },
      de: { word: 'Fisch', pronunciation: '/fɪʃ/' },
      pt: { word: 'peixe', pronunciation: '/ˈpej.ʃi/' },
      el: { word: 'ψάρι', pronunciation: '/ˈpsa.ri/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1425082661507-6af0db74ab56?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'rabbit', pronunciation: '/ˈræb.ɪt/' },
      es: { word: 'conejo', pronunciation: '/ko.ˈne.xo/' },
      fr: { word: 'lapin', pronunciation: '/la.pɛ̃/' },
      it: { word: 'coniglio', pronunciation: '/ko.ˈniʎ.ʎo/' },
      de: { word: 'Kaninchen', pronunciation: '/ka.ˈniːn.çən/' },
      pt: { word: 'coelho', pronunciation: '/ko.ˈe.ʎu/' },
      el: { word: 'κουνέλι', pronunciation: '/ku.ˈne.li/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'horse', pronunciation: '/hɔːrs/' },
      es: { word: 'caballo', pronunciation: '/ka.ˈβa.ʎo/' },
      fr: { word: 'cheval', pronunciation: '/ʃə.val/' },
      it: { word: 'cavallo', pronunciation: '/ka.ˈval.lo/' },
      de: { word: 'Pferd', pronunciation: '/pfeːɐ̯t/' },
      pt: { word: 'cavalo', pronunciation: '/ka.ˈva.lu/' },
      el: { word: 'άλογο', pronunciation: '/ˈa.lo.ɣo/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1425082661507-6af0db74ab56?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'cow', pronunciation: '/kaʊ/' },
      es: { word: 'vaca', pronunciation: '/ˈba.ka/' },
      fr: { word: 'vache', pronunciation: '/vaʃ/' },
      it: { word: 'mucca', pronunciation: '/ˈmuk.ka/' },
      de: { word: 'Kuh', pronunciation: '/kuː/' },
      pt: { word: 'vaca', pronunciation: '/ˈva.kɐ/' },
      el: { word: 'αγελάδα', pronunciation: '/a.ʝe.ˈla.ða/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1425082661507-6af0db74ab56?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'duck', pronunciation: '/dʌk/' },
      es: { word: 'pato', pronunciation: '/ˈpa.to/' },
      fr: { word: 'canard', pronunciation: '/ka.naʁ/' },
      it: { word: 'anatra', pronunciation: '/ˈa.na.tra/' },
      de: { word: 'Ente', pronunciation: '/ˈɛn.tə/' },
      pt: { word: 'pato', pronunciation: '/ˈpa.tu/' },
      el: { word: 'πάπια', pronunciation: '/ˈpa.pja/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1459682687441-7761439a709d?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🐕 ANIMALS - INTERMEDIATE (6 words)
  // ============================================================
  {
    category: 'animals', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'elephant', pronunciation: '/ˈel.ɪ.fənt/' },
      es: { word: 'elefante', pronunciation: '/e.le.ˈfan.te/' },
      fr: { word: 'éléphant', pronunciation: '/e.le.fɑ̃/' },
      it: { word: 'elefante', pronunciation: '/e.le.ˈfan.te/' },
      de: { word: 'Elefant', pronunciation: '/e.le.ˈfant/' },
      pt: { word: 'elefante', pronunciation: '/e.le.ˈfɐ̃.tɨ/' },
      el: { word: 'ελέφαντας', pronunciation: '/e.ˈle.fan.das/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1456926631375-92c8ce872def?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'lion', pronunciation: '/ˈlaɪ.ən/' },
      es: { word: 'león', pronunciation: '/le.ˈon/' },
      fr: { word: 'lion', pronunciation: '/ljɔ̃/' },
      it: { word: 'leone', pronunciation: '/le.ˈo.ne/' },
      de: { word: 'Löwe', pronunciation: '/ˈløː.və/' },
      pt: { word: 'leão', pronunciation: '/le.ˈɐ̃w̃/' },
      el: { word: 'λιοντάρι', pronunciation: '/li.on.ˈda.ri/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'giraffe', pronunciation: '/dʒɪˈræf/' },
      es: { word: 'jirafa', pronunciation: '/xi.ˈra.fa/' },
      fr: { word: 'girafe', pronunciation: '/ʒi.ʁaf/' },
      it: { word: 'giraffa', pronunciation: '/dʒi.ˈraf.fa/' },
      de: { word: 'Giraffe', pronunciation: '/ɡi.ˈʁa.fə/' },
      pt: { word: 'girafa', pronunciation: '/ʒi.ˈɾa.fɐ/' },
      el: { word: 'καμηλοπάρδαλη', pronunciation: '/ka.mi.lo.ˈpar.ða.li/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1456926631375-92c8ce872def?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'zebra', pronunciation: '/ˈziː.brə/' },
      es: { word: 'cebra', pronunciation: '/ˈθe.βɾa/' },
      fr: { word: 'zèbre', pronunciation: '/zɛbʁ/' },
      it: { word: 'zebra', pronunciation: '/ˈdzɛ.bra/' },
      de: { word: 'Zebra', pronunciation: '/ˈtseː.bʁa/' },
      pt: { word: 'zebra', pronunciation: '/ˈze.bɾɐ/' },
      el: { word: 'ζέβρα', pronunciation: '/ˈze.vra/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1456926631375-92c8ce872def?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'penguin', pronunciation: '/ˈpeŋ.ɡwɪn/' },
      es: { word: 'pingüino', pronunciation: '/piŋ.ˈɡwi.no/' },
      fr: { word: 'pingouin', pronunciation: '/pɛ̃.ɡwɛ̃/' },
      it: { word: 'pinguino', pronunciation: '/piŋ.ˈɡwi.no/' },
      de: { word: 'Pinguin', pronunciation: '/ˈpɪŋ.ɡu.iːn/' },
      pt: { word: 'pinguim', pronunciation: '/pĩ.ˈɡwĩ/' },
      el: { word: 'πιγκουίνος', pronunciation: '/piŋ.ɡu.ˈi.nos/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1462888210965-cdf193fb74de?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'dolphin', pronunciation: '/ˈdɒl.fɪn/' },
      es: { word: 'delfín', pronunciation: '/del.ˈfin/' },
      fr: { word: 'dauphin', pronunciation: '/do.fɛ̃/' },
      it: { word: 'delfino', pronunciation: '/del.ˈfi.no/' },
      de: { word: 'Delfin', pronunciation: '/dɛl.ˈfiːn/' },
      pt: { word: 'golfinho', pronunciation: '/ɡow.ˈfi.ɲu/' },
      el: { word: 'δελφίνι', pronunciation: '/ðel.ˈfi.ni/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1462888210965-cdf193fb74de?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1456926631375-92c8ce872def?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🐕 ANIMALS - ADVANCED (6 words)
  // ============================================================
  {
    category: 'animals', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'chameleon', pronunciation: '/kəˈmiː.li.ən/' },
      es: { word: 'camaleón', pronunciation: '/ka.ma.le.ˈon/' },
      fr: { word: 'caméléon', pronunciation: '/ka.me.le.ɔ̃/' },
      it: { word: 'camaleonte', pronunciation: '/ka.ma.le.ˈon.te/' },
      de: { word: 'Chamäleon', pronunciation: '/ka.ˈmɛː.le.on/' },
      pt: { word: 'camaleão', pronunciation: '/ka.ma.le.ˈɐ̃w̃/' },
      el: { word: 'χαμαιλέοντας', pronunciation: '/xa.me.ˈle.on.das/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1515592302427-6ae93bce3948?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1504450874802-0ba2bcd659e0?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'turtle', pronunciation: '/ˈtɜːr.t̬əl/' },
      es: { word: 'tortuga', pronunciation: '/toɾ.ˈtu.ɣa/' },
      fr: { word: 'tortue', pronunciation: '/tɔʁ.ty/' },
      it: { word: 'tartaruga', pronunciation: '/tar.ta.ˈru.ɡa/' },
      de: { word: 'Schildkröte', pronunciation: '/ˈʃɪlt.kʁøː.tə/' },
      pt: { word: 'tartaruga', pronunciation: '/taɾ.ta.ˈɾu.ɡɐ/' },
      el: { word: 'χελώνα', pronunciation: '/xe.ˈlo.na/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1515592302427-6ae93bce3948?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1504450874802-0ba2bcd659e0?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'octopus', pronunciation: '/ˈɒk.tə.pəs/' },
      es: { word: 'pulpo', pronunciation: '/ˈpul.po/' },
      fr: { word: 'pieuvre', pronunciation: '/pjœvʁ/' },
      it: { word: 'polpo', pronunciation: '/ˈpol.po/' },
      de: { word: 'Oktopus', pronunciation: '/ɔk.ˈtoː.pʊs/' },
      pt: { word: 'polvo', pronunciation: '/ˈpow.vu/' },
      el: { word: 'χταπόδι', pronunciation: '/xta.ˈpo.ði/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1504450874802-0ba2bcd659e0?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1515592302427-6ae93bce3948?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'flamingo', pronunciation: '/fləˈmɪŋ.ɡoʊ/' },
      es: { word: 'flamenco', pronunciation: '/fla.ˈmeŋ.ko/' },
      fr: { word: 'flamant', pronunciation: '/fla.mɑ̃/' },
      it: { word: 'fenicottero', pronunciation: '/fe.ni.ˈkot.te.ro/' },
      de: { word: 'Flamingo', pronunciation: '/fla.ˈmɪŋ.ɡo/' },
      pt: { word: 'flamingo', pronunciation: '/fla.ˈmĩ.ɡu/' },
      el: { word: 'φλαμίνγκο', pronunciation: '/fla.ˈmiŋ.ɡo/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1462888210965-cdf193fb74de?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'hedgehog', pronunciation: '/ˈhedʒ.hɒɡ/' },
      es: { word: 'erizo', pronunciation: '/e.ˈɾi.θo/' },
      fr: { word: 'hérisson', pronunciation: '/e.ʁi.sɔ̃/' },
      it: { word: 'riccio', pronunciation: '/ˈrit.tʃo/' },
      de: { word: 'Igel', pronunciation: '/ˈiː.ɡəl/' },
      pt: { word: 'ouriço', pronunciation: '/o.ˈɾi.su/' },
      el: { word: 'σκαντζόχοιρος', pronunciation: '/skan.ˈdzo.xi.ros/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1497752531616-c3afd9760a11?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1504450874802-0ba2bcd659e0?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'animals', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'owl', pronunciation: '/aʊl/' },
      es: { word: 'búho', pronunciation: '/ˈbu.o/' },
      fr: { word: 'hibou', pronunciation: '/i.bu/' },
      it: { word: 'gufo', pronunciation: '/ˈɡu.fo/' },
      de: { word: 'Eule', pronunciation: '/ˈɔʏ.lə/' },
      pt: { word: 'coruja', pronunciation: '/ko.ˈɾu.ʒɐ/' },
      el: { word: 'κουκουβάγια', pronunciation: '/ku.ku.ˈva.ʝa/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1543549790-8b5f4a028cfb?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1497752531616-c3afd9760a11?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1515592302427-6ae93bce3948?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🍎 FOOD - BEGINNER (8 words)
  // ============================================================
  {
    category: 'food', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'apple', pronunciation: '/ˈæp.əl/' },
      es: { word: 'manzana', pronunciation: '/man.ˈsa.na/' },
      fr: { word: 'pomme', pronunciation: '/pɔm/' },
      it: { word: 'mela', pronunciation: '/ˈme.la/' },
      de: { word: 'Apfel', pronunciation: '/ˈap.fəl/' },
      pt: { word: 'maçã', pronunciation: '/ma.ˈsɐ̃/' },
      el: { word: 'μήλο', pronunciation: '/ˈmi.lo/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'banana', pronunciation: '/bəˈnæn.ə/' },
      es: { word: 'plátano', pronunciation: '/ˈpla.ta.no/' },
      fr: { word: 'banane', pronunciation: '/ba.nan/' },
      it: { word: 'banana', pronunciation: '/ba.ˈna.na/' },
      de: { word: 'Banane', pronunciation: '/ba.ˈnaː.nə/' },
      pt: { word: 'banana', pronunciation: '/ba.ˈna.na/' },
      el: { word: 'μπανάνα', pronunciation: '/ba.ˈna.na/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1553279768-865429fa0078?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'bread', pronunciation: '/bred/' },
      es: { word: 'pan', pronunciation: '/pan/' },
      fr: { word: 'pain', pronunciation: '/pɛ̃/' },
      it: { word: 'pane', pronunciation: '/ˈpa.ne/' },
      de: { word: 'Brot', pronunciation: '/bʁoːt/' },
      pt: { word: 'pão', pronunciation: '/ˈpɐ̃w̃/' },
      el: { word: 'ψωμί', pronunciation: '/pso.ˈmi/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'egg', pronunciation: '/eɡ/' },
      es: { word: 'huevo', pronunciation: '/ˈwe.βo/' },
      fr: { word: 'œuf', pronunciation: '/œf/' },
      it: { word: 'uovo', pronunciation: '/ˈwɔ.vo/' },
      de: { word: 'Ei', pronunciation: '/aɪ/' },
      pt: { word: 'ovo', pronunciation: '/ˈo.vu/' },
      el: { word: 'αυγό', pronunciation: '/av.ˈɣo/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'milk', pronunciation: '/mɪlk/' },
      es: { word: 'leche', pronunciation: '/ˈle.tʃe/' },
      fr: { word: 'lait', pronunciation: '/lɛ/' },
      it: { word: 'latte', pronunciation: '/ˈlat.te/' },
      de: { word: 'Milch', pronunciation: '/mɪlç/' },
      pt: { word: 'leite', pronunciation: '/ˈlej.tʃi/' },
      el: { word: 'γάλα', pronunciation: '/ˈɣa.la/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1553279768-865429fa0078?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'orange', pronunciation: '/ˈɒr.ɪndʒ/' },
      es: { word: 'naranja', pronunciation: '/na.ˈɾan.xa/' },
      fr: { word: 'orange', pronunciation: '/ɔ.ʁɑ̃ʒ/' },
      it: { word: 'arancia', pronunciation: '/a.ˈran.tʃa/' },
      de: { word: 'Orange', pronunciation: '/o.ˈʁɑ̃ː.ʒə/' },
      pt: { word: 'laranja', pronunciation: '/la.ˈɾɐ̃.ʒɐ/' },
      el: { word: 'πορτοκάλι', pronunciation: '/por.to.ˈka.li/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'rice', pronunciation: '/raɪs/' },
      es: { word: 'arroz', pronunciation: '/a.ˈroθ/' },
      fr: { word: 'riz', pronunciation: '/ʁi/' },
      it: { word: 'riso', pronunciation: '/ˈri.zo/' },
      de: { word: 'Reis', pronunciation: '/ʁaɪs/' },
      pt: { word: 'arroz', pronunciation: '/a.ˈʁoʃ/' },
      el: { word: 'ρύζι', pronunciation: '/ˈri.zi/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'cheese', pronunciation: '/tʃiːz/' },
      es: { word: 'queso', pronunciation: '/ˈke.so/' },
      fr: { word: 'fromage', pronunciation: '/fʁɔ.maʒ/' },
      it: { word: 'formaggio', pronunciation: '/for.ˈmad.dʒo/' },
      de: { word: 'Käse', pronunciation: '/ˈkɛː.zə/' },
      pt: { word: 'queijo', pronunciation: '/ˈkej.ʒu/' },
      el: { word: 'τυρί', pronunciation: '/ti.ˈri/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🍎 FOOD - INTERMEDIATE (6 words)
  // ============================================================
  {
    category: 'food', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'strawberry', pronunciation: '/ˈstrɔː.bər.i/' },
      es: { word: 'fresa', pronunciation: '/ˈfɾe.sa/' },
      fr: { word: 'fraise', pronunciation: '/fʁɛz/' },
      it: { word: 'fragola', pronunciation: '/ˈfra.ɡo.la/' },
      de: { word: 'Erdbeere', pronunciation: '/ˈeːɐ̯t.beː.ʁə/' },
      pt: { word: 'morango', pronunciation: '/mo.ˈɾɐ̃.ɡu/' },
      el: { word: 'φράουλα', pronunciation: '/ˈfra.u.la/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'pineapple', pronunciation: '/ˈpaɪn.æp.əl/' },
      es: { word: 'piña', pronunciation: '/ˈpi.ɲa/' },
      fr: { word: 'ananas', pronunciation: '/a.na.nas/' },
      it: { word: 'ananas', pronunciation: '/ˈa.na.nas/' },
      de: { word: 'Ananas', pronunciation: '/ˈa.na.nas/' },
      pt: { word: 'abacaxi', pronunciation: '/a.ba.ka.ˈʃi/' },
      el: { word: 'ανανάς', pronunciation: '/a.na.ˈnas/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'watermelon', pronunciation: '/ˈwɔː.tər.mel.ən/' },
      es: { word: 'sandía', pronunciation: '/san.ˈdi.a/' },
      fr: { word: 'pastèque', pronunciation: '/pas.tɛk/' },
      it: { word: 'anguria', pronunciation: '/aŋ.ˈɡu.ri.a/' },
      de: { word: 'Wassermelone', pronunciation: '/ˈva.sɐ.me.loː.nə/' },
      pt: { word: 'melancia', pronunciation: '/me.lɐ̃.ˈsi.ɐ/' },
      el: { word: 'καρπούζι', pronunciation: '/kar.ˈpu.zi/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'tomato', pronunciation: '/təˈmeɪ.toʊ/' },
      es: { word: 'tomate', pronunciation: '/to.ˈma.te/' },
      fr: { word: 'tomate', pronunciation: '/tɔ.mat/' },
      it: { word: 'pomodoro', pronunciation: '/po.mo.ˈdɔ.ro/' },
      de: { word: 'Tomate', pronunciation: '/to.ˈmaː.tə/' },
      pt: { word: 'tomate', pronunciation: '/to.ˈma.tɨ/' },
      el: { word: 'ντομάτα', pronunciation: '/do.ˈma.ta/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1518977676601-b53f82ber40?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'carrot', pronunciation: '/ˈkær.ət/' },
      es: { word: 'zanahoria', pronunciation: '/θa.na.ˈo.ɾja/' },
      fr: { word: 'carotte', pronunciation: '/ka.ʁɔt/' },
      it: { word: 'carota', pronunciation: '/ka.ˈrɔ.ta/' },
      de: { word: 'Karotte', pronunciation: '/ka.ˈʁɔ.tə/' },
      pt: { word: 'cenoura', pronunciation: '/se.ˈno.ɾɐ/' },
      el: { word: 'καρότο', pronunciation: '/ka.ˈro.to/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'mushroom', pronunciation: '/ˈmʌʃ.ruːm/' },
      es: { word: 'champiñón', pronunciation: '/tʃam.pi.ˈɲon/' },
      fr: { word: 'champignon', pronunciation: '/ʃɑ̃.pi.ɲɔ̃/' },
      it: { word: 'fungo', pronunciation: '/ˈfuŋ.ɡo/' },
      de: { word: 'Pilz', pronunciation: '/pɪlts/' },
      pt: { word: 'cogumelo', pronunciation: '/ko.ɡu.ˈme.lu/' },
      el: { word: 'μανιτάρι', pronunciation: '/ma.ni.ˈta.ri/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aabd40?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🍎 FOOD - ADVANCED (6 words)
  // ============================================================
  {
    category: 'food', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'avocado', pronunciation: '/ˌæv.əˈkɑː.doʊ/' },
      es: { word: 'aguacate', pronunciation: '/a.ɣwa.ˈka.te/' },
      fr: { word: 'avocat', pronunciation: '/a.vɔ.ka/' },
      it: { word: 'avocado', pronunciation: '/a.vo.ˈka.do/' },
      de: { word: 'Avocado', pronunciation: '/a.vo.ˈkaː.do/' },
      pt: { word: 'abacate', pronunciation: '/a.ba.ˈka.tɨ/' },
      el: { word: 'αβοκάντο', pronunciation: '/a.vo.ˈka.do/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1596591868264-4626949c4e1c?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1563252722-6434563a985d?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'artichoke', pronunciation: '/ˈɑːr.tɪ.tʃoʊk/' },
      es: { word: 'alcachofa', pronunciation: '/al.ka.ˈtʃo.fa/' },
      fr: { word: 'artichaut', pronunciation: '/aʁ.ti.ʃo/' },
      it: { word: 'carciofo', pronunciation: '/kar.ˈtʃɔ.fo/' },
      de: { word: 'Artischocke', pronunciation: '/aʁ.ti.ˈʃɔ.kə/' },
      pt: { word: 'alcachofra', pronunciation: '/aw.ka.ˈʃo.fɾɐ/' },
      el: { word: 'αγκινάρα', pronunciation: '/aŋ.ɡi.ˈna.ra/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1596591868264-4626949c4e1c?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1563252722-6434563a985d?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'pomegranate', pronunciation: '/ˈpɒm.ɪ.ɡræn.ɪt/' },
      es: { word: 'granada', pronunciation: '/ɡɾa.ˈna.ða/' },
      fr: { word: 'grenade', pronunciation: '/ɡʁə.nad/' },
      it: { word: 'melograno', pronunciation: '/me.lo.ˈɡra.no/' },
      de: { word: 'Granatapfel', pronunciation: '/ɡʁa.ˈnaːt.ap.fəl/' },
      pt: { word: 'romã', pronunciation: '/ʁo.ˈmɐ̃/' },
      el: { word: 'ρόδι', pronunciation: '/ˈro.ði/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1563252722-6434563a985d?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1596591868264-4626949c4e1c?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'eggplant', pronunciation: '/ˈeɡ.plænt/' },
      es: { word: 'berenjena', pronunciation: '/be.ɾen.ˈxe.na/' },
      fr: { word: 'aubergine', pronunciation: '/o.bɛʁ.ʒin/' },
      it: { word: 'melanzana', pronunciation: '/me.lan.ˈdza.na/' },
      de: { word: 'Aubergine', pronunciation: '/o.bɛʁ.ˈʒiː.nə/' },
      pt: { word: 'berinjela', pronunciation: '/be.ɾĩ.ˈʒɛ.lɐ/' },
      el: { word: 'μελιτζάνα', pronunciation: '/me.li.ˈdza.na/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1563252722-6434563a985d?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'broccoli', pronunciation: '/ˈbrɒk.əl.i/' },
      es: { word: 'brócoli', pronunciation: '/ˈbɾo.ko.li/' },
      fr: { word: 'brocoli', pronunciation: '/bʁɔ.kɔ.li/' },
      it: { word: 'broccoli', pronunciation: '/ˈbrɔk.ko.li/' },
      de: { word: 'Brokkoli', pronunciation: '/ˈbʁɔ.ko.li/' },
      pt: { word: 'brócolis', pronunciation: '/ˈbɾɔ.ko.lis/' },
      el: { word: 'μπρόκολο', pronunciation: '/ˈbro.ko.lo/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'food', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'coconut', pronunciation: '/ˈkoʊ.kə.nʌt/' },
      es: { word: 'coco', pronunciation: '/ˈko.ko/' },
      fr: { word: 'noix de coco', pronunciation: '/nwa də ko.ko/' },
      it: { word: 'cocco', pronunciation: '/ˈkɔk.ko/' },
      de: { word: 'Kokosnuss', pronunciation: '/ˈko.kos.nʊs/' },
      pt: { word: 'coco', pronunciation: '/ˈko.ku/' },
      el: { word: 'καρύδα', pronunciation: '/ka.ˈri.ða/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🌈 COLORS - BEGINNER (8 words)
  // ============================================================
  {
    category: 'colors', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'red', pronunciation: '/red/' },
      es: { word: 'rojo', pronunciation: '/ˈro.xo/' },
      fr: { word: 'rouge', pronunciation: '/ʁuʒ/' },
      it: { word: 'rosso', pronunciation: '/ˈros.so/' },
      de: { word: 'rot', pronunciation: '/roːt/' },
      pt: { word: 'vermelho', pronunciation: '/veʁ.ˈme.ʎu/' },
      el: { word: 'κόκκινο', pronunciation: '/ˈko.ci.no/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1535025639604-9a804c092faa?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'blue', pronunciation: '/bluː/' },
      es: { word: 'azul', pronunciation: '/a.ˈθul/' },
      fr: { word: 'bleu', pronunciation: '/blø/' },
      it: { word: 'blu', pronunciation: '/blu/' },
      de: { word: 'blau', pronunciation: '/blaʊ/' },
      pt: { word: 'azul', pronunciation: '/a.ˈzuw/' },
      el: { word: 'μπλε', pronunciation: '/ble/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1535025639604-9a804c092faa?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'green', pronunciation: '/ɡriːn/' },
      es: { word: 'verde', pronunciation: '/ˈbeɾ.ðe/' },
      fr: { word: 'vert', pronunciation: '/vɛʁ/' },
      it: { word: 'verde', pronunciation: '/ˈver.de/' },
      de: { word: 'grün', pronunciation: '/ɡʁyːn/' },
      pt: { word: 'verde', pronunciation: '/ˈveɾ.dɨ/' },
      el: { word: 'πράσινο', pronunciation: '/ˈpra.si.no/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'yellow', pronunciation: '/ˈjel.oʊ/' },
      es: { word: 'amarillo', pronunciation: '/a.ma.ˈɾi.ʎo/' },
      fr: { word: 'jaune', pronunciation: '/ʒon/' },
      it: { word: 'giallo', pronunciation: '/ˈdʒal.lo/' },
      de: { word: 'gelb', pronunciation: '/ɡɛlp/' },
      pt: { word: 'amarelo', pronunciation: '/a.ma.ˈɾe.lu/' },
      el: { word: 'κίτρινο', pronunciation: '/ˈci.tri.no/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1495542779398-9fec7dc068bd?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1535025639604-9a804c092faa?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'white', pronunciation: '/waɪt/' },
      es: { word: 'blanco', pronunciation: '/ˈblaŋ.ko/' },
      fr: { word: 'blanc', pronunciation: '/blɑ̃/' },
      it: { word: 'bianco', pronunciation: '/ˈbjaŋ.ko/' },
      de: { word: 'weiß', pronunciation: '/vaɪs/' },
      pt: { word: 'branco', pronunciation: '/ˈbɾɐ̃.ku/' },
      el: { word: 'λευκό', pronunciation: '/lef.ˈko/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1495542779398-9fec7dc068bd?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'black', pronunciation: '/blæk/' },
      es: { word: 'negro', pronunciation: '/ˈne.ɣɾo/' },
      fr: { word: 'noir', pronunciation: '/nwaʁ/' },
      it: { word: 'nero', pronunciation: '/ˈne.ro/' },
      de: { word: 'schwarz', pronunciation: '/ʃvaʁts/' },
      pt: { word: 'preto', pronunciation: '/ˈpɾe.tu/' },
      el: { word: 'μαύρο', pronunciation: '/ˈmav.ro/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'orange', pronunciation: '/ˈɒr.ɪndʒ/' },
      es: { word: 'naranja', pronunciation: '/na.ˈɾan.xa/' },
      fr: { word: 'orange', pronunciation: '/ɔ.ʁɑ̃ʒ/' },
      it: { word: 'arancione', pronunciation: '/a.ran.ˈtʃo.ne/' },
      de: { word: 'orange', pronunciation: '/o.ˈʁɑ̃ːʒ/' },
      pt: { word: 'laranja', pronunciation: '/la.ˈɾɐ̃.ʒɐ/' },
      el: { word: 'πορτοκαλί', pronunciation: '/por.to.ka.ˈli/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1495542779398-9fec7dc068bd?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'pink', pronunciation: '/pɪŋk/' },
      es: { word: 'rosa', pronunciation: '/ˈro.sa/' },
      fr: { word: 'rose', pronunciation: '/ʁoz/' },
      it: { word: 'rosa', pronunciation: '/ˈrɔ.za/' },
      de: { word: 'rosa', pronunciation: '/ˈʁoː.za/' },
      pt: { word: 'rosa', pronunciation: '/ˈʁo.zɐ/' },
      el: { word: 'ροζ', pronunciation: '/roz/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🌈 COLORS - INTERMEDIATE (6 words)
  // ============================================================
  {
    category: 'colors', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'purple', pronunciation: '/ˈpɜːr.pəl/' },
      es: { word: 'morado', pronunciation: '/mo.ˈɾa.ðo/' },
      fr: { word: 'violet', pronunciation: '/vjɔ.lɛ/' },
      it: { word: 'viola', pronunciation: '/ˈvjɔ.la/' },
      de: { word: 'lila', pronunciation: '/ˈliː.la/' },
      pt: { word: 'roxo', pronunciation: '/ˈʁo.ʃu/' },
      el: { word: 'μωβ', pronunciation: '/mov/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'brown', pronunciation: '/braʊn/' },
      es: { word: 'marrón', pronunciation: '/ma.ˈron/' },
      fr: { word: 'marron', pronunciation: '/ma.ʁɔ̃/' },
      it: { word: 'marrone', pronunciation: '/mar.ˈro.ne/' },
      de: { word: 'braun', pronunciation: '/bʁaʊn/' },
      pt: { word: 'marrom', pronunciation: '/ma.ˈʁõ/' },
      el: { word: 'καφέ', pronunciation: '/ka.ˈfe/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'gray', pronunciation: '/ɡreɪ/' },
      es: { word: 'gris', pronunciation: '/ɡɾis/' },
      fr: { word: 'gris', pronunciation: '/ɡʁi/' },
      it: { word: 'grigio', pronunciation: '/ˈɡri.dʒo/' },
      de: { word: 'grau', pronunciation: '/ɡʁaʊ/' },
      pt: { word: 'cinza', pronunciation: '/ˈsĩ.zɐ/' },
      el: { word: 'γκρι', pronunciation: '/ɡri/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1494256997604-768d1f608cac?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'gold', pronunciation: '/ɡoʊld/' },
      es: { word: 'dorado', pronunciation: '/do.ˈɾa.ðo/' },
      fr: { word: 'doré', pronunciation: '/dɔ.ʁe/' },
      it: { word: 'oro', pronunciation: '/ˈɔ.ro/' },
      de: { word: 'gold', pronunciation: '/ɡɔlt/' },
      pt: { word: 'dourado', pronunciation: '/do.ˈɾa.du/' },
      el: { word: 'χρυσό', pronunciation: '/xri.ˈso/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1494256997604-768d1f608cac?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'silver', pronunciation: '/ˈsɪl.vər/' },
      es: { word: 'plateado', pronunciation: '/pla.te.ˈa.ðo/' },
      fr: { word: 'argenté', pronunciation: '/aʁ.ʒɑ̃.te/' },
      it: { word: 'argento', pronunciation: '/ar.ˈdʒen.to/' },
      de: { word: 'silber', pronunciation: '/ˈzɪl.bɐ/' },
      pt: { word: 'prateado', pronunciation: '/pɾa.te.ˈa.du/' },
      el: { word: 'ασημί', pronunciation: '/a.si.ˈmi/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1494256997604-768d1f608cac?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'turquoise', pronunciation: '/ˈtɜːr.kwɔɪz/' },
      es: { word: 'turquesa', pronunciation: '/tuɾ.ˈke.sa/' },
      fr: { word: 'turquoise', pronunciation: '/tyʁ.kwaz/' },
      it: { word: 'turchese', pronunciation: '/tur.ˈke.ze/' },
      de: { word: 'türkis', pronunciation: '/tʏʁ.ˈkiːs/' },
      pt: { word: 'turquesa', pronunciation: '/tuɾ.ˈke.zɐ/' },
      el: { word: 'τιρκουάζ', pronunciation: '/tir.ku.ˈaz/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🌈 COLORS - ADVANCED (6 words)
  // ============================================================
  {
    category: 'colors', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'crimson', pronunciation: '/ˈkrɪm.zən/' },
      es: { word: 'carmesí', pronunciation: '/kaɾ.me.ˈsi/' },
      fr: { word: 'cramoisi', pronunciation: '/kʁa.mwa.zi/' },
      it: { word: 'cremisi', pronunciation: '/kre.ˈmi.zi/' },
      de: { word: 'karmesinrot', pronunciation: '/kaʁ.me.ˈziːn.ʁoːt/' },
      pt: { word: 'carmesim', pronunciation: '/kaɾ.me.ˈzĩ/' },
      el: { word: 'βυσσινί', pronunciation: '/vi.si.ˈni/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'ivory', pronunciation: '/ˈaɪ.vər.i/' },
      es: { word: 'marfil', pronunciation: '/maɾ.ˈfil/' },
      fr: { word: 'ivoire', pronunciation: '/i.vwaʁ/' },
      it: { word: 'avorio', pronunciation: '/a.ˈvɔ.rjo/' },
      de: { word: 'elfenbein', pronunciation: '/ˈɛl.fən.baɪn/' },
      pt: { word: 'marfim', pronunciation: '/maɾ.ˈfĩ/' },
      el: { word: 'ιβουάρ', pronunciation: '/i.vu.ˈar/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'indigo', pronunciation: '/ˈɪn.dɪ.ɡoʊ/' },
      es: { word: 'índigo', pronunciation: '/ˈin.di.ɣo/' },
      fr: { word: 'indigo', pronunciation: '/ɛ̃.di.ɡo/' },
      it: { word: 'indaco', pronunciation: '/ˈin.da.ko/' },
      de: { word: 'indigo', pronunciation: '/ˈɪn.di.ɡo/' },
      pt: { word: 'índigo', pronunciation: '/ˈĩ.di.ɡu/' },
      el: { word: 'λουλακί', pronunciation: '/lu.la.ˈci/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'magenta', pronunciation: '/məˈdʒen.tə/' },
      es: { word: 'magenta', pronunciation: '/ma.ˈxen.ta/' },
      fr: { word: 'magenta', pronunciation: '/ma.ʒɛ̃.ta/' },
      it: { word: 'magenta', pronunciation: '/ma.ˈdʒen.ta/' },
      de: { word: 'magenta', pronunciation: '/ma.ˈɡɛn.ta/' },
      pt: { word: 'magenta', pronunciation: '/ma.ˈʒẽ.tɐ/' },
      el: { word: 'ματζέντα', pronunciation: '/ma.ˈdzen.da/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'coral', pronunciation: '/ˈkɒr.əl/' },
      es: { word: 'coral', pronunciation: '/ko.ˈɾal/' },
      fr: { word: 'corail', pronunciation: '/kɔ.ʁaj/' },
      it: { word: 'corallo', pronunciation: '/ko.ˈral.lo/' },
      de: { word: 'koralle', pronunciation: '/ko.ˈʁa.lə/' },
      pt: { word: 'coral', pronunciation: '/ko.ˈɾaw/' },
      el: { word: 'κοραλλί', pronunciation: '/ko.ra.ˈli/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'colors', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'teal', pronunciation: '/tiːl/' },
      es: { word: 'verde azulado', pronunciation: '/ˈbeɾ.ðe a.θu.ˈla.ðo/' },
      fr: { word: 'sarcelle', pronunciation: '/saʁ.sɛl/' },
      it: { word: 'foglia di tè', pronunciation: '/ˈfɔʎ.ʎa di tɛ/' },
      de: { word: 'blaugrün', pronunciation: '/ˈblaʊ.ɡʁyːn/' },
      pt: { word: 'azul-petróleo', pronunciation: '/a.ˈzuw pe.ˈtɾɔ.le.u/' },
      el: { word: 'πετρόλ', pronunciation: '/pe.ˈtrol/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1520262454473-a1a82276a574?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🔢 NUMBERS - BEGINNER (8 words)
  // ============================================================
  {
    category: 'numbers', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'one', pronunciation: '/wʌn/' },
      es: { word: 'uno', pronunciation: '/ˈu.no/' },
      fr: { word: 'un', pronunciation: '/œ̃/' },
      it: { word: 'uno', pronunciation: '/ˈu.no/' },
      de: { word: 'eins', pronunciation: '/aɪns/' },
      pt: { word: 'um', pronunciation: '/ũ/' },
      el: { word: 'ένα', pronunciation: '/ˈe.na/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1502570149819-b2260483d302?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1584714268709-c3dd9c92b378?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1586521995568-39abaa0c2f3c?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'two', pronunciation: '/tuː/' },
      es: { word: 'dos', pronunciation: '/dos/' },
      fr: { word: 'deux', pronunciation: '/dø/' },
      it: { word: 'due', pronunciation: '/ˈdu.e/' },
      de: { word: 'zwei', pronunciation: '/tsvaɪ/' },
      pt: { word: 'dois', pronunciation: '/dojʃ/' },
      el: { word: 'δύο', pronunciation: '/ˈði.o/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1584714268709-c3dd9c92b378?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1502570149819-b2260483d302?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1586521995568-39abaa0c2f3c?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'three', pronunciation: '/θriː/' },
      es: { word: 'tres', pronunciation: '/tɾes/' },
      fr: { word: 'trois', pronunciation: '/tʁwa/' },
      it: { word: 'tre', pronunciation: '/tre/' },
      de: { word: 'drei', pronunciation: '/dʁaɪ/' },
      pt: { word: 'três', pronunciation: '/tɾeʃ/' },
      el: { word: 'τρία', pronunciation: '/ˈtri.a/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1586521995568-39abaa0c2f3c?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1502570149819-b2260483d302?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1584714268709-c3dd9c92b378?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'four', pronunciation: '/fɔːr/' },
      es: { word: 'cuatro', pronunciation: '/ˈkwa.tɾo/' },
      fr: { word: 'quatre', pronunciation: '/katʁ/' },
      it: { word: 'quattro', pronunciation: '/ˈkwat.tro/' },
      de: { word: 'vier', pronunciation: '/fiːɐ̯/' },
      pt: { word: 'quatro', pronunciation: '/ˈkwa.tɾu/' },
      el: { word: 'τέσσερα', pronunciation: '/ˈte.se.ra/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1586521995568-39abaa0c2f3c?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1502570149819-b2260483d302?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'five', pronunciation: '/faɪv/' },
      es: { word: 'cinco', pronunciation: '/ˈθiŋ.ko/' },
      fr: { word: 'cinq', pronunciation: '/sɛ̃k/' },
      it: { word: 'cinque', pronunciation: '/ˈtʃiŋ.kwe/' },
      de: { word: 'fünf', pronunciation: '/fʏnf/' },
      pt: { word: 'cinco', pronunciation: '/ˈsĩ.ku/' },
      el: { word: 'πέντε', pronunciation: '/ˈpen.de/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1584714268709-c3dd9c92b378?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'six', pronunciation: '/sɪks/' },
      es: { word: 'seis', pronunciation: '/sejs/' },
      fr: { word: 'six', pronunciation: '/sis/' },
      it: { word: 'sei', pronunciation: '/sɛj/' },
      de: { word: 'sechs', pronunciation: '/zɛks/' },
      pt: { word: 'seis', pronunciation: '/sejʃ/' },
      el: { word: 'έξι', pronunciation: '/ˈe.ksi/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1596568362037-0c0f0e6e3b1e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'seven', pronunciation: '/ˈsev.ən/' },
      es: { word: 'siete', pronunciation: '/ˈsje.te/' },
      fr: { word: 'sept', pronunciation: '/sɛt/' },
      it: { word: 'sette', pronunciation: '/ˈset.te/' },
      de: { word: 'sieben', pronunciation: '/ˈziː.bən/' },
      pt: { word: 'sete', pronunciation: '/ˈsɛ.tɨ/' },
      el: { word: 'επτά', pronunciation: '/e.ˈpta/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1569235186275-626ac911ee25?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1596568362037-0c0f0e6e3b1e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'ten', pronunciation: '/ten/' },
      es: { word: 'diez', pronunciation: '/djeθ/' },
      fr: { word: 'dix', pronunciation: '/dis/' },
      it: { word: 'dieci', pronunciation: '/ˈdjɛ.tʃi/' },
      de: { word: 'zehn', pronunciation: '/tseːn/' },
      pt: { word: 'dez', pronunciation: '/dɛʃ/' },
      el: { word: 'δέκα', pronunciation: '/ˈðe.ka/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1569235186275-626ac911ee25?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1596568362037-0c0f0e6e3b1e?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🔢 NUMBERS - INTERMEDIATE (6 words)
  // ============================================================
  {
    category: 'numbers', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'twelve', pronunciation: '/twelv/' },
      es: { word: 'doce', pronunciation: '/ˈdo.θe/' },
      fr: { word: 'douze', pronunciation: '/duz/' },
      it: { word: 'dodici', pronunciation: '/ˈdo.di.tʃi/' },
      de: { word: 'zwölf', pronunciation: '/tsvœlf/' },
      pt: { word: 'doze', pronunciation: '/ˈdo.zɨ/' },
      el: { word: 'δώδεκα', pronunciation: '/ˈðo.ðe.ka/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1563396983906-b3795482a59a?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1569235186275-626ac911ee25?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'fifteen', pronunciation: '/ˌfɪfˈtiːn/' },
      es: { word: 'quince', pronunciation: '/ˈkin.θe/' },
      fr: { word: 'quinze', pronunciation: '/kɛ̃z/' },
      it: { word: 'quindici', pronunciation: '/ˈkwin.di.tʃi/' },
      de: { word: 'fünfzehn', pronunciation: '/ˈfʏnf.tseːn/' },
      pt: { word: 'quinze', pronunciation: '/ˈkĩ.zɨ/' },
      el: { word: 'δεκαπέντε', pronunciation: '/ðe.ka.ˈpen.de/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1563396983906-b3795482a59a?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'twenty', pronunciation: '/ˈtwen.ti/' },
      es: { word: 'veinte', pronunciation: '/ˈbejn.te/' },
      fr: { word: 'vingt', pronunciation: '/vɛ̃/' },
      it: { word: 'venti', pronunciation: '/ˈven.ti/' },
      de: { word: 'zwanzig', pronunciation: '/ˈtsvan.tsɪç/' },
      pt: { word: 'vinte', pronunciation: '/ˈvĩ.tɨ/' },
      el: { word: 'είκοσι', pronunciation: '/ˈi.ko.si/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1596568362037-0c0f0e6e3b1e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1563396983906-b3795482a59a?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'fifty', pronunciation: '/ˈfɪf.ti/' },
      es: { word: 'cincuenta', pronunciation: '/θiŋ.ˈkwen.ta/' },
      fr: { word: 'cinquante', pronunciation: '/sɛ̃.kɑ̃t/' },
      it: { word: 'cinquanta', pronunciation: '/tʃiŋ.ˈkwan.ta/' },
      de: { word: 'fünfzig', pronunciation: '/ˈfʏnf.tsɪç/' },
      pt: { word: 'cinquenta', pronunciation: '/sĩ.ˈkwẽ.tɐ/' },
      el: { word: 'πενήντα', pronunciation: '/pe.ˈnin.da/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1596568362037-0c0f0e6e3b1e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'hundred', pronunciation: '/ˈhʌn.drəd/' },
      es: { word: 'cien', pronunciation: '/θjen/' },
      fr: { word: 'cent', pronunciation: '/sɑ̃/' },
      it: { word: 'cento', pronunciation: '/ˈtʃen.to/' },
      de: { word: 'hundert', pronunciation: '/ˈhʊn.dɐt/' },
      pt: { word: 'cem', pronunciation: '/sẽj/' },
      el: { word: 'εκατό', pronunciation: '/e.ka.ˈto/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1569235186275-626ac911ee25?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1596568362037-0c0f0e6e3b1e?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'zero', pronunciation: '/ˈzɪə.roʊ/' },
      es: { word: 'cero', pronunciation: '/ˈθe.ɾo/' },
      fr: { word: 'zéro', pronunciation: '/ze.ʁo/' },
      it: { word: 'zero', pronunciation: '/ˈdzɛ.ro/' },
      de: { word: 'null', pronunciation: '/nʊl/' },
      pt: { word: 'zero', pronunciation: '/ˈzɛ.ɾu/' },
      el: { word: 'μηδέν', pronunciation: '/mi.ˈðen/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1502570149819-b2260483d302?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1569235186275-626ac911ee25?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🔢 NUMBERS - ADVANCED (6 words)
  // ============================================================
  {
    category: 'numbers', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'thousand', pronunciation: '/ˈθaʊ.zənd/' },
      es: { word: 'mil', pronunciation: '/mil/' },
      fr: { word: 'mille', pronunciation: '/mil/' },
      it: { word: 'mille', pronunciation: '/ˈmil.le/' },
      de: { word: 'tausend', pronunciation: '/ˈtaʊ.zənt/' },
      pt: { word: 'mil', pronunciation: '/miw/' },
      el: { word: 'χίλια', pronunciation: '/ˈçi.lja/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1502570149819-b2260483d302?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'million', pronunciation: '/ˈmɪl.jən/' },
      es: { word: 'millón', pronunciation: '/mi.ˈʎon/' },
      fr: { word: 'million', pronunciation: '/mi.ljɔ̃/' },
      it: { word: 'milione', pronunciation: '/mi.ˈljo.ne/' },
      de: { word: 'Million', pronunciation: '/mɪ.ˈljoːn/' },
      pt: { word: 'milhão', pronunciation: '/mi.ˈʎɐ̃w̃/' },
      el: { word: 'εκατομμύριο', pronunciation: '/e.ka.to.ˈmi.ri.o/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1584714268709-c3dd9c92b378?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1586521995568-39abaa0c2f3c?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'first', pronunciation: '/fɜːrst/' },
      es: { word: 'primero', pronunciation: '/pɾi.ˈme.ɾo/' },
      fr: { word: 'premier', pronunciation: '/pʁə.mje/' },
      it: { word: 'primo', pronunciation: '/ˈpri.mo/' },
      de: { word: 'erste', pronunciation: '/ˈeːɐ̯s.tə/' },
      pt: { word: 'primeiro', pronunciation: '/pɾi.ˈmej.ɾu/' },
      el: { word: 'πρώτος', pronunciation: '/ˈpro.tos/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1586521995568-39abaa0c2f3c?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1584714268709-c3dd9c92b378?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'half', pronunciation: '/hæf/' },
      es: { word: 'mitad', pronunciation: '/mi.ˈtað/' },
      fr: { word: 'moitié', pronunciation: '/mwa.tje/' },
      it: { word: 'metà', pronunciation: '/me.ˈta/' },
      de: { word: 'halb', pronunciation: '/halp/' },
      pt: { word: 'metade', pronunciation: '/me.ˈta.dɨ/' },
      el: { word: 'μισό', pronunciation: '/mi.ˈso/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1586521995568-39abaa0c2f3c?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'double', pronunciation: '/ˈdʌb.əl/' },
      es: { word: 'doble', pronunciation: '/ˈdo.βle/' },
      fr: { word: 'double', pronunciation: '/dubl/' },
      it: { word: 'doppio', pronunciation: '/ˈdop.pjo/' },
      de: { word: 'doppelt', pronunciation: '/ˈdɔ.pəlt/' },
      pt: { word: 'dobro', pronunciation: '/ˈdo.bɾu/' },
      el: { word: 'διπλό', pronunciation: '/ði.ˈplo/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1563396983906-b3795482a59a?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1502570149819-b2260483d302?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'numbers', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'dozen', pronunciation: '/ˈdʌz.ən/' },
      es: { word: 'docena', pronunciation: '/do.ˈθe.na/' },
      fr: { word: 'douzaine', pronunciation: '/du.zɛn/' },
      it: { word: 'dozzina', pronunciation: '/dod.ˈdzi.na/' },
      de: { word: 'Dutzend', pronunciation: '/ˈdʊ.tsənt/' },
      pt: { word: 'dúzia', pronunciation: '/ˈdu.zjɐ/' },
      el: { word: 'ντουζίνα', pronunciation: '/du.ˈzi.na/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1563396983906-b3795482a59a?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1584714268709-c3dd9c92b378?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 📱 OBJECTS - BEGINNER (8 words)
  // ============================================================
  {
    category: 'objects', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'book', pronunciation: '/bʊk/' },
      es: { word: 'libro', pronunciation: '/ˈli.βɾo/' },
      fr: { word: 'livre', pronunciation: '/livʁ/' },
      it: { word: 'libro', pronunciation: '/ˈli.bro/' },
      de: { word: 'Buch', pronunciation: '/buːx/' },
      pt: { word: 'livro', pronunciation: '/ˈli.vɾu/' },
      el: { word: 'βιβλίο', pronunciation: '/vi.ˈvli.o/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'phone', pronunciation: '/foʊn/' },
      es: { word: 'teléfono', pronunciation: '/te.ˈle.fo.no/' },
      fr: { word: 'téléphone', pronunciation: '/te.le.fɔn/' },
      it: { word: 'telefono', pronunciation: '/te.ˈlɛ.fo.no/' },
      de: { word: 'Telefon', pronunciation: '/te.le.ˈfoːn/' },
      pt: { word: 'telefone', pronunciation: '/te.le.ˈfɔ.nɨ/' },
      el: { word: 'τηλέφωνο', pronunciation: '/ti.ˈle.fo.no/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'watch', pronunciation: '/wɒtʃ/' },
      es: { word: 'reloj', pronunciation: '/re.ˈlox/' },
      fr: { word: 'montre', pronunciation: '/mɔ̃tʁ/' },
      it: { word: 'orologio', pronunciation: '/o.ro.ˈlɔ.dʒo/' },
      de: { word: 'Uhr', pronunciation: '/uːɐ̯/' },
      pt: { word: 'relógio', pronunciation: '/ʁe.ˈlɔ.ʒju/' },
      el: { word: 'ρολόι', pronunciation: '/ro.ˈlo.i/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'key', pronunciation: '/kiː/' },
      es: { word: 'llave', pronunciation: '/ˈʎa.βe/' },
      fr: { word: 'clé', pronunciation: '/kle/' },
      it: { word: 'chiave', pronunciation: '/ˈkja.ve/' },
      de: { word: 'Schlüssel', pronunciation: '/ˈʃlʏ.səl/' },
      pt: { word: 'chave', pronunciation: '/ˈʃa.vɨ/' },
      el: { word: 'κλειδί', pronunciation: '/kli.ˈði/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'chair', pronunciation: '/tʃeər/' },
      es: { word: 'silla', pronunciation: '/ˈsi.ʎa/' },
      fr: { word: 'chaise', pronunciation: '/ʃɛz/' },
      it: { word: 'sedia', pronunciation: '/ˈsɛ.dja/' },
      de: { word: 'Stuhl', pronunciation: '/ʃtuːl/' },
      pt: { word: 'cadeira', pronunciation: '/ka.ˈdej.ɾɐ/' },
      el: { word: 'καρέκλα', pronunciation: '/ka.ˈre.kla/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'table', pronunciation: '/ˈteɪ.bəl/' },
      es: { word: 'mesa', pronunciation: '/ˈme.sa/' },
      fr: { word: 'table', pronunciation: '/tabl/' },
      it: { word: 'tavolo', pronunciation: '/ˈta.vo.lo/' },
      de: { word: 'Tisch', pronunciation: '/tɪʃ/' },
      pt: { word: 'mesa', pronunciation: '/ˈme.zɐ/' },
      el: { word: 'τραπέζι', pronunciation: '/tra.ˈpe.zi/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1503602642458-232111445657?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'cup', pronunciation: '/kʌp/' },
      es: { word: 'taza', pronunciation: '/ˈta.θa/' },
      fr: { word: 'tasse', pronunciation: '/tas/' },
      it: { word: 'tazza', pronunciation: '/ˈtat.tsa/' },
      de: { word: 'Tasse', pronunciation: '/ˈta.sə/' },
      pt: { word: 'xícara', pronunciation: '/ˈʃi.ka.ɾɐ/' },
      el: { word: 'φλιτζάνι', pronunciation: '/fli.ˈdza.ni/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1503602642458-232111445657?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'pen', pronunciation: '/pen/' },
      es: { word: 'bolígrafo', pronunciation: '/bo.ˈli.ɣɾa.fo/' },
      fr: { word: 'stylo', pronunciation: '/sti.lo/' },
      it: { word: 'penna', pronunciation: '/ˈpen.na/' },
      de: { word: 'Kugelschreiber', pronunciation: '/ˈkuː.ɡəl.ʃʁaɪ.bɐ/' },
      pt: { word: 'caneta', pronunciation: '/ka.ˈne.tɐ/' },
      el: { word: 'στυλό', pronunciation: '/sti.ˈlo/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 📱 OBJECTS - INTERMEDIATE (6 words)
  // ============================================================
  {
    category: 'objects', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'umbrella', pronunciation: '/ʌmˈbrel.ə/' },
      es: { word: 'paraguas', pronunciation: '/pa.ˈɾa.ɣwas/' },
      fr: { word: 'parapluie', pronunciation: '/pa.ʁa.plɥi/' },
      it: { word: 'ombrello', pronunciation: '/om.ˈbrɛl.lo/' },
      de: { word: 'Regenschirm', pronunciation: '/ˈʁeː.ɡən.ʃɪʁm/' },
      pt: { word: 'guarda-chuva', pronunciation: '/ˈɡwaɾ.dɐ ˈʃu.vɐ/' },
      el: { word: 'ομπρέλα', pronunciation: '/o.ˈbre.la/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1534309466160-70b22cc6254d?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'sunglasses', pronunciation: '/ˈsʌn.ɡlæs.ɪz/' },
      es: { word: 'gafas de sol', pronunciation: '/ˈɡa.fas ðe sol/' },
      fr: { word: 'lunettes de soleil', pronunciation: '/ly.nɛt də sɔ.lɛj/' },
      it: { word: 'occhiali da sole', pronunciation: '/ok.ˈkja.li da ˈso.le/' },
      de: { word: 'Sonnenbrille', pronunciation: '/ˈzɔ.nən.bʁɪ.lə/' },
      pt: { word: 'óculos de sol', pronunciation: '/ˈɔ.ku.luʃ dɨ sɔw/' },
      el: { word: 'γυαλιά ηλίου', pronunciation: '/ʝa.ˈlja i.ˈli.u/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1534309466160-70b22cc6254d?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'camera', pronunciation: '/ˈkæm.ər.ə/' },
      es: { word: 'cámara', pronunciation: '/ˈka.ma.ɾa/' },
      fr: { word: 'appareil photo', pronunciation: '/a.pa.ʁɛj fo.to/' },
      it: { word: 'fotocamera', pronunciation: '/fo.to.ˈka.me.ra/' },
      de: { word: 'Kamera', pronunciation: '/ˈka.me.ʁa/' },
      pt: { word: 'câmera', pronunciation: '/ˈkɐ.me.ɾɐ/' },
      el: { word: 'κάμερα', pronunciation: '/ˈka.me.ra/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1534309466160-70b22cc6254d?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'bicycle', pronunciation: '/ˈbaɪ.sɪ.kəl/' },
      es: { word: 'bicicleta', pronunciation: '/bi.θi.ˈkle.ta/' },
      fr: { word: 'vélo', pronunciation: '/ve.lo/' },
      it: { word: 'bicicletta', pronunciation: '/bi.tʃi.ˈklet.ta/' },
      de: { word: 'Fahrrad', pronunciation: '/ˈfaːɐ̯.ʁaːt/' },
      pt: { word: 'bicicleta', pronunciation: '/bi.si.ˈklɛ.tɐ/' },
      el: { word: 'ποδήλατο', pronunciation: '/po.ˈði.la.to/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1534309466160-70b22cc6254d?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'guitar', pronunciation: '/ɡɪˈtɑːr/' },
      es: { word: 'guitarra', pronunciation: '/ɡi.ˈta.ra/' },
      fr: { word: 'guitare', pronunciation: '/ɡi.taʁ/' },
      it: { word: 'chitarra', pronunciation: '/ki.ˈtar.ra/' },
      de: { word: 'Gitarre', pronunciation: '/ɡi.ˈta.ʁə/' },
      pt: { word: 'guitarra', pronunciation: '/ɡi.ˈta.ʁɐ/' },
      el: { word: 'κιθάρα', pronunciation: '/ci.ˈθa.ra/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'lamp', pronunciation: '/læmp/' },
      es: { word: 'lámpara', pronunciation: '/ˈlam.pa.ɾa/' },
      fr: { word: 'lampe', pronunciation: '/lɑ̃p/' },
      it: { word: 'lampada', pronunciation: '/ˈlam.pa.da/' },
      de: { word: 'Lampe', pronunciation: '/ˈlam.pə/' },
      pt: { word: 'lâmpada', pronunciation: '/ˈlɐ̃.pa.dɐ/' },
      el: { word: 'λάμπα', pronunciation: '/ˈla.ba/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 📱 OBJECTS - ADVANCED (6 words)
  // ============================================================
  {
    category: 'objects', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'telescope', pronunciation: '/ˈtel.ɪ.skoʊp/' },
      es: { word: 'telescopio', pronunciation: '/te.les.ˈko.pjo/' },
      fr: { word: 'télescope', pronunciation: '/te.lɛs.kɔp/' },
      it: { word: 'telescopio', pronunciation: '/te.le.ˈskɔ.pjo/' },
      de: { word: 'Teleskop', pronunciation: '/te.le.ˈskoːp/' },
      pt: { word: 'telescópio', pronunciation: '/te.leʃ.ˈkɔ.pju/' },
      el: { word: 'τηλεσκόπιο', pronunciation: '/ti.le.ˈsko.pi.o/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1532968961962-8a0cb3a2d4f5?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'compass', pronunciation: '/ˈkʌm.pəs/' },
      es: { word: 'brújula', pronunciation: '/ˈbɾu.xu.la/' },
      fr: { word: 'boussole', pronunciation: '/bu.sɔl/' },
      it: { word: 'bussola', pronunciation: '/ˈbus.so.la/' },
      de: { word: 'Kompass', pronunciation: '/ˈkɔm.pas/' },
      pt: { word: 'bússola', pronunciation: '/ˈbu.su.lɐ/' },
      el: { word: 'πυξίδα', pronunciation: '/pi.ˈksi.ða/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1532968961962-8a0cb3a2d4f5?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'hourglass', pronunciation: '/ˈaʊər.ɡlæs/' },
      es: { word: 'reloj de arena', pronunciation: '/re.ˈlox ðe a.ˈɾe.na/' },
      fr: { word: 'sablier', pronunciation: '/sa.blje/' },
      it: { word: 'clessidra', pronunciation: '/ˈkles.si.dra/' },
      de: { word: 'Sanduhr', pronunciation: '/ˈzant.uːɐ̯/' },
      pt: { word: 'ampulheta', pronunciation: '/ɐ̃.pu.ˈʎe.tɐ/' },
      el: { word: 'κλεψύδρα', pronunciation: '/kle.ˈpsi.ðra/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1501139083538-0139583c060f?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1532968961962-8a0cb3a2d4f5?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'typewriter', pronunciation: '/ˈtaɪp.raɪ.tər/' },
      es: { word: 'máquina de escribir', pronunciation: '/ˈma.ki.na ðe es.kɾi.ˈβiɾ/' },
      fr: { word: 'machine à écrire', pronunciation: '/ma.ʃin a e.kʁiʁ/' },
      it: { word: 'macchina da scrivere', pronunciation: '/ˈmak.ki.na da ˈskri.ve.re/' },
      de: { word: 'Schreibmaschine', pronunciation: '/ˈʃʁaɪp.ma.ʃiː.nə/' },
      pt: { word: 'máquina de escrever', pronunciation: '/ˈma.ki.nɐ dɨ ɨʃ.kɾe.ˈveɾ/' },
      el: { word: 'γραφομηχανή', pronunciation: '/ɣra.fo.mi.xa.ˈni/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1504691342899-4d92b50853e1?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1501139083538-0139583c060f?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'microscope', pronunciation: '/ˈmaɪ.krə.skoʊp/' },
      es: { word: 'microscopio', pronunciation: '/mi.kɾos.ˈko.pjo/' },
      fr: { word: 'microscope', pronunciation: '/mi.kʁɔs.kɔp/' },
      it: { word: 'microscopio', pronunciation: '/mi.kro.ˈskɔ.pjo/' },
      de: { word: 'Mikroskop', pronunciation: '/mi.kʁo.ˈskoːp/' },
      pt: { word: 'microscópio', pronunciation: '/mi.kɾoʃ.ˈkɔ.pju/' },
      el: { word: 'μικροσκόπιο', pronunciation: '/mi.kro.ˈsko.pi.o/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1504691342899-4d92b50853e1?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1532968961962-8a0cb3a2d4f5?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'objects', difficulty: 'advanced', languageCode: 'multi',
    translations: {
      en: { word: 'chandelier', pronunciation: '/ˌʃæn.dəˈlɪər/' },
      es: { word: 'candelabro', pronunciation: '/kan.de.ˈla.βɾo/' },
      fr: { word: 'lustre', pronunciation: '/lystʁ/' },
      it: { word: 'lampadario', pronunciation: '/lam.pa.ˈda.rjo/' },
      de: { word: 'Kronleuchter', pronunciation: '/ˈkʁoːn.lɔʏ̯ç.tɐ/' },
      pt: { word: 'candelabro', pronunciation: '/kɐ̃.de.ˈla.bɾu/' },
      el: { word: 'πολυέλαιος', pronunciation: '/po.li.ˈe.le.os/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1543198126-a8ad8e47fb22?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1501139083538-0139583c060f?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🌲 NATURE - BEGINNER (8 words)
  // ============================================================
  {
    category: 'nature', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'tree', pronunciation: '/triː/' },
      es: { word: 'árbol', pronunciation: '/ˈaɾ.βol/' },
      fr: { word: 'arbre', pronunciation: '/aʁbʁ/' },
      it: { word: 'albero', pronunciation: '/ˈal.be.ro/' },
      de: { word: 'Baum', pronunciation: '/baʊm/' },
      pt: { word: 'árvore', pronunciation: '/ˈaɾ.vu.ɾɨ/' },
      el: { word: 'δέντρο', pronunciation: '/ˈðen.dro/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'flower', pronunciation: '/ˈflaʊ.ər/' },
      es: { word: 'flor', pronunciation: '/floɾ/' },
      fr: { word: 'fleur', pronunciation: '/flœʁ/' },
      it: { word: 'fiore', pronunciation: '/ˈfjo.re/' },
      de: { word: 'Blume', pronunciation: '/ˈbluː.mə/' },
      pt: { word: 'flor', pronunciation: '/floɾ/' },
      el: { word: 'λουλούδι', pronunciation: '/lu.ˈlu.ði/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'sun', pronunciation: '/sʌn/' },
      es: { word: 'sol', pronunciation: '/sol/' },
      fr: { word: 'soleil', pronunciation: '/sɔ.lɛj/' },
      it: { word: 'sole', pronunciation: '/ˈso.le/' },
      de: { word: 'Sonne', pronunciation: '/ˈzɔ.nə/' },
      pt: { word: 'sol', pronunciation: '/sɔw/' },
      el: { word: 'ήλιος', pronunciation: '/ˈi.li.os/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'moon', pronunciation: '/muːn/' },
      es: { word: 'luna', pronunciation: '/ˈlu.na/' },
      fr: { word: 'lune', pronunciation: '/lyn/' },
      it: { word: 'luna', pronunciation: '/ˈlu.na/' },
      de: { word: 'Mond', pronunciation: '/moːnt/' },
      pt: { word: 'lua', pronunciation: '/ˈlu.ɐ/' },
      el: { word: 'φεγγάρι', pronunciation: '/feŋ.ˈɡa.ri/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'rain', pronunciation: '/reɪn/' },
      es: { word: 'lluvia', pronunciation: '/ˈʎu.βja/' },
      fr: { word: 'pluie', pronunciation: '/plɥi/' },
      it: { word: 'pioggia', pronunciation: '/ˈpjɔd.dʒa/' },
      de: { word: 'Regen', pronunciation: '/ˈʁeː.ɡən/' },
      pt: { word: 'chuva', pronunciation: '/ˈʃu.vɐ/' },
      el: { word: 'βροχή', pronunciation: '/vro.ˈçi/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'mountain', pronunciation: '/ˈmaʊn.tən/' },
      es: { word: 'montaña', pronunciation: '/mon.ˈta.ɲa/' },
      fr: { word: 'montagne', pronunciation: '/mɔ̃.taɲ/' },
      it: { word: 'montagna', pronunciation: '/mon.ˈta.ɲa/' },
      de: { word: 'Berg', pronunciation: '/bɛʁk/' },
      pt: { word: 'montanha', pronunciation: '/mõ.ˈta.ɲɐ/' },
      el: { word: 'βουνό', pronunciation: '/vu.ˈno/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'river', pronunciation: '/ˈrɪv.ər/' },
      es: { word: 'río', pronunciation: '/ˈri.o/' },
      fr: { word: 'rivière', pronunciation: '/ʁi.vjɛʁ/' },
      it: { word: 'fiume', pronunciation: '/ˈfju.me/' },
      de: { word: 'Fluss', pronunciation: '/flʊs/' },
      pt: { word: 'rio', pronunciation: '/ˈʁi.u/' },
      el: { word: 'ποτάμι', pronunciation: '/po.ˈta.mi/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'beginner', languageCode: 'multi',
    translations: {
      en: { word: 'beach', pronunciation: '/biːtʃ/' },
      es: { word: 'playa', pronunciation: '/ˈpla.ʝa/' },
      fr: { word: 'plage', pronunciation: '/plaʒ/' },
      it: { word: 'spiaggia', pronunciation: '/ˈspjad.dʒa/' },
      de: { word: 'Strand', pronunciation: '/ʃtʁant/' },
      pt: { word: 'praia', pronunciation: '/ˈpɾa.jɐ/' },
      el: { word: 'παραλία', pronunciation: '/pa.ra.ˈli.a/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&h=300&fit=crop'
    ]
  },
  // ============================================================
  // 🌲 NATURE - INTERMEDIATE (6 words)
  // ============================================================
  {
    category: 'nature', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'waterfall', pronunciation: '/ˈwɔː.tər.fɔːl/' },
      es: { word: 'cascada', pronunciation: '/kas.ˈka.ða/' },
      fr: { word: 'cascade', pronunciation: '/kas.kad/' },
      it: { word: 'cascata', pronunciation: '/kas.ˈka.ta/' },
      de: { word: 'Wasserfall', pronunciation: '/ˈva.sɐ.fal/' },
      pt: { word: 'cachoeira', pronunciation: '/ka.ʃo.ˈej.ɾɐ/' },
      el: { word: 'καταρράκτης', pronunciation: '/ka.ta.ˈra.ktis/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1432405972618-c6b0cfba8b3e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'volcano', pronunciation: '/vɒlˈkeɪ.noʊ/' },
      es: { word: 'volcán', pronunciation: '/bol.ˈkan/' },
      fr: { word: 'volcan', pronunciation: '/vɔl.kɑ̃/' },
      it: { word: 'vulcano', pronunciation: '/vul.ˈka.no/' },
      de: { word: 'Vulkan', pronunciation: '/vʊl.ˈkaːn/' },
      pt: { word: 'vulcão', pronunciation: '/vuw.ˈkɐ̃w̃/' },
      el: { word: 'ηφαίστειο', pronunciation: '/i.ˈfe.sti.o/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1554232456-8727aae0862d?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1432405972618-c6b0cfba8b3e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'desert', pronunciation: '/ˈdez.ɚt/' },
      es: { word: 'desierto', pronunciation: '/de.ˈsjeɾ.to/' },
      fr: { word: 'désert', pronunciation: '/de.zɛʁ/' },
      it: { word: 'deserto', pronunciation: '/de.ˈzɛr.to/' },
      de: { word: 'Wüste', pronunciation: '/ˈvʏs.tə/' },
      pt: { word: 'deserto', pronunciation: '/de.ˈzɛɾ.tu/' },
      el: { word: 'έρημος', pronunciation: '/ˈe.ri.mos/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1554232456-8727aae0862d?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1432405972618-c6b0cfba8b3e?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'rainbow', pronunciation: '/ˈreɪn.boʊ/' },
      es: { word: 'arcoíris', pronunciation: '/aɾ.ko.ˈi.ɾis/' },
      fr: { word: 'arc-en-ciel', pronunciation: '/aʁ.kɑ̃.sjɛl/' },
      it: { word: 'arcobaleno', pronunciation: '/ar.ko.ba.ˈle.no/' },
      de: { word: 'Regenbogen', pronunciation: '/ˈʁeː.ɡən.boː.ɡən/' },
      pt: { word: 'arco-íris', pronunciation: '/ˈaɾ.ku ˈi.ɾiʃ/' },
      el: { word: 'ουράνιο τόξο', pronunciation: '/u.ˈra.ni.o ˈto.kso/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1554232456-8727aae0862d?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'forest', pronunciation: '/ˈfɒr.ɪst/' },
      es: { word: 'bosque', pronunciation: '/ˈbos.ke/' },
      fr: { word: 'forêt', pronunciation: '/fɔ.ʁɛ/' },
      it: { word: 'foresta', pronunciation: '/fo.ˈrɛs.ta/' },
      de: { word: 'Wald', pronunciation: '/valt/' },
      pt: { word: 'floresta', pronunciation: '/flo.ˈɾɛʃ.tɐ/' },
      el: { word: 'δάσος', pronunciation: '/ˈða.sos/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=300&h=300&fit=crop'
    ]
  },
  {
    category: 'nature', difficulty: 'intermediate', languageCode: 'multi',
    translations: {
      en: { word: 'island', pronunciation: '/ˈaɪ.lənd/' },
      es: { word: 'isla', pronunciation: '/ˈis.la/' },
      fr: { word: 'île', pronunciation: '/il/' },
      it: { word: 'isola', pronunciation: '/ˈi.zo.la/' },
      de: { word: 'Insel', pronunciation: '/ˈɪn.zəl/' },
      pt: { word: 'ilha', pronunciation: '/ˈi.ʎɐ/' },
      el: { word: 'νησί', pronunciation: '/ni.ˈsi/' }
    },
    imageUrl: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=300&h=300&fit=crop',
    distractorImages: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=300&h=300&fit=crop'
    ]
  },
