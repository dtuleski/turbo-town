#!/usr/bin/env python3
"""
Bulk seed language learning words into DynamoDB.
Covers: animals, food, colors, body, clothing, nature, household, transport, professions
Difficulties: beginner, intermediate, advanced
Languages: en, es, fr, de, it, pt

Usage: python3 scripts/seed-language-words.py
"""

import boto3
import json
from datetime import datetime, timezone

TABLE_NAME = "memory-game-language-words-dev"
REGION = "us-east-1"

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

U = "https://images.unsplash.com"
now = datetime.now(timezone.utc).isoformat()

def img(photo_id, w=400, h=400):
    return f"{U}/{photo_id}?w={w}&h={h}&fit=crop"

# fmt: off
WORDS = [
    # ===================== ANIMALS - BEGINNER =====================
    {
        "id": "animals_horse", "cat": "animals", "diff": "beginner",
        "img": img("photo-1553284965-83fd3e82fa5a"),
        "d": [img("photo-1557862921-37829c790f19"), img("photo-1516467508483-a7212febe31a")],
        "t": {
            "en": ["Horse", "hɔːrs"], "es": ["Caballo", "ka.ba.ʎo"],
            "fr": ["Cheval", "ʃə.val"], "de": ["Pferd", "pfeːɐ̯t"],
            "it": ["Cavallo", "ka.val.lo"], "pt": ["Cavalo", "ka.va.lu"],
        },
    },
    {
        "id": "animals_fish", "cat": "animals", "diff": "beginner",
        "img": img("photo-1535591273668-578e31182c4f"),
        "d": [img("photo-1474511320723-9a56873571b7"), img("photo-1437622368342-7a3d73a34c8f")],
        "t": {
            "en": ["Fish", "fɪʃ"], "es": ["Pez", "peθ"],
            "fr": ["Poisson", "pwa.sɔ̃"], "de": ["Fisch", "fɪʃ"],
            "it": ["Pesce", "pe.ʃe"], "pt": ["Peixe", "pej.ʃi"],
        },
    },
    {
        "id": "animals_bird", "cat": "animals", "diff": "beginner",
        "img": img("photo-1606567595334-d39972c85dbe"),
        "d": [img("photo-1474511320723-9a56873571b7"), img("photo-1585110396000-c9ffd4e4b308")],
        "t": {
            "en": ["Bird", "bɜːrd"], "es": ["Pájaro", "pa.xa.ɾo"],
            "fr": ["Oiseau", "wa.zo"], "de": ["Vogel", "foː.ɡl̩"],
            "it": ["Uccello", "ut.ʃel.lo"], "pt": ["Pássaro", "pa.sa.ɾu"],
        },
    },
    {
        "id": "animals_rabbit", "cat": "animals", "diff": "beginner",
        "img": img("photo-1585110396000-c9ffd4e4b308"),
        "d": [img("photo-1514888286974-6c03e2ca1dba"), img("photo-1606567595334-d39972c85dbe")],
        "t": {
            "en": ["Rabbit", "ræb.ɪt"], "es": ["Conejo", "ko.ne.xo"],
            "fr": ["Lapin", "la.pɛ̃"], "de": ["Kaninchen", "ka.niːn.çən"],
            "it": ["Coniglio", "ko.ni.ʎo"], "pt": ["Coelho", "ku.e.ʎu"],
        },
    },
    {
        "id": "animals_cow", "cat": "animals", "diff": "beginner",
        "img": img("photo-1570042225831-d98fa7577f1e"),
        "d": [img("photo-1553284965-83fd3e82fa5a"), img("photo-1516467508483-a7212febe31a")],
        "t": {
            "en": ["Cow", "kaʊ"], "es": ["Vaca", "ba.ka"],
            "fr": ["Vache", "vaʃ"], "de": ["Kuh", "kuː"],
            "it": ["Mucca", "muk.ka"], "pt": ["Vaca", "va.kɐ"],
        },
    },
    # ===================== ANIMALS - INTERMEDIATE =====================
    {
        "id": "animals_elephant", "cat": "animals", "diff": "intermediate",
        "img": img("photo-1557050543-4d5f4e07ef46"),
        "d": [img("photo-1474511320723-9a56873571b7"), img("photo-1570042225831-d98fa7577f1e")],
        "t": {
            "en": ["Elephant", "el.ɪ.fənt"], "es": ["Elefante", "e.le.fan.te"],
            "fr": ["Éléphant", "e.le.fɑ̃"], "de": ["Elefant", "e.le.fant"],
            "it": ["Elefante", "e.le.fan.te"], "pt": ["Elefante", "e.le.fɐ̃.tɨ"],
        },
    },
    {
        "id": "animals_lion", "cat": "animals", "diff": "intermediate",
        "img": img("photo-1546182990-dffeafbe841d"),
        "d": [img("photo-1557050543-4d5f4e07ef46"), img("photo-1437622368342-7a3d73a34c8f")],
        "t": {
            "en": ["Lion", "laɪ.ən"], "es": ["León", "le.on"],
            "fr": ["Lion", "ljɔ̃"], "de": ["Löwe", "lø.və"],
            "it": ["Leone", "le.o.ne"], "pt": ["Leão", "le.ɐ̃w̃"],
        },
    },
    {
        "id": "animals_penguin", "cat": "animals", "diff": "intermediate",
        "img": img("photo-1551986782-d0169b3f8fa7"),
        "d": [img("photo-1606567595334-d39972c85dbe"), img("photo-1535591273668-578e31182c4f")],
        "t": {
            "en": ["Penguin", "peŋ.ɡwɪn"], "es": ["Pingüino", "piŋ.ɡwi.no"],
            "fr": ["Pingouin", "pɛ̃.ɡwɛ̃"], "de": ["Pinguin", "pɪŋ.ɡu.iːn"],
            "it": ["Pinguino", "piŋ.ɡwi.no"], "pt": ["Pinguim", "pĩ.ɡwĩ"],
        },
    },
    {
        "id": "animals_dolphin", "cat": "animals", "diff": "intermediate",
        "img": img("photo-1607153333879-c174d265f1d2"),
        "d": [img("photo-1535591273668-578e31182c4f"), img("photo-1551986782-d0169b3f8fa7")],
        "t": {
            "en": ["Dolphin", "dɒl.fɪn"], "es": ["Delfín", "del.fin"],
            "fr": ["Dauphin", "do.fɛ̃"], "de": ["Delfin", "dɛl.fiːn"],
            "it": ["Delfino", "del.fi.no"], "pt": ["Golfinho", "ɡow.fi.ɲu"],
        },
    },
    {
        "id": "animals_giraffe", "cat": "animals", "diff": "intermediate",
        "img": img("photo-1547721064-da6cfb341d50"),
        "d": [img("photo-1557050543-4d5f4e07ef46"), img("photo-1546182990-dffeafbe841d")],
        "t": {
            "en": ["Giraffe", "dʒɪ.rɑːf"], "es": ["Jirafa", "xi.ra.fa"],
            "fr": ["Girafe", "ʒi.ʁaf"], "de": ["Giraffe", "ɡi.ʁa.fə"],
            "it": ["Giraffa", "dʒi.raf.fa"], "pt": ["Girafa", "ʒi.ɾa.fɐ"],
        },
    },
    # ===================== ANIMALS - ADVANCED =====================
    {
        "id": "animals_chameleon", "cat": "animals", "diff": "advanced",
        "img": img("photo-1597517697687-acc0c17b2603"),
        "d": [img("photo-1474511320723-9a56873571b7"), img("photo-1551986782-d0169b3f8fa7")],
        "t": {
            "en": ["Chameleon", "kə.miː.li.ən"], "es": ["Camaleón", "ka.ma.le.on"],
            "fr": ["Caméléon", "ka.me.le.ɔ̃"], "de": ["Chamäleon", "ka.mɛ.le.on"],
            "it": ["Camaleonte", "ka.ma.le.on.te"], "pt": ["Camaleão", "kɐ.mɐ.le.ɐ̃w̃"],
        },
    },
    {
        "id": "animals_hedgehog", "cat": "animals", "diff": "advanced",
        "img": img("photo-1497752531616-c3afd9760a11"),
        "d": [img("photo-1585110396000-c9ffd4e4b308"), img("photo-1570042225831-d98fa7577f1e")],
        "t": {
            "en": ["Hedgehog", "hedʒ.hɒɡ"], "es": ["Erizo", "e.ɾi.θo"],
            "fr": ["Hérisson", "e.ʁi.sɔ̃"], "de": ["Igel", "iː.ɡl̩"],
            "it": ["Riccio", "rit.tʃo"], "pt": ["Ouriço", "ow.ɾi.su"],
        },
    },
    {
        "id": "animals_octopus", "cat": "animals", "diff": "advanced",
        "img": img("photo-1545671913-b89ac1b4ac10"),
        "d": [img("photo-1607153333879-c174d265f1d2"), img("photo-1535591273668-578e31182c4f")],
        "t": {
            "en": ["Octopus", "ɒk.tə.pəs"], "es": ["Pulpo", "pul.po"],
            "fr": ["Pieuvre", "pjœvʁ"], "de": ["Oktopus", "ɔk.to.pʊs"],
            "it": ["Polpo", "pol.po"], "pt": ["Polvo", "pow.vu"],
        },
    },
    # ===================== FOOD - BEGINNER =====================
    {
        "id": "food_apple", "cat": "food", "diff": "beginner",
        "img": img("photo-1568702846914-96b305d2ead1"),
        "d": [img("photo-1587132137056-bfbf0166836e"), img("photo-1550258987-190a2d41a8ba")],
        "t": {
            "en": ["Apple", "æp.l̩"], "es": ["Manzana", "man.θa.na"],
            "fr": ["Pomme", "pɔm"], "de": ["Apfel", "ap.fl̩"],
            "it": ["Mela", "me.la"], "pt": ["Maçã", "mɐ.sɐ̃"],
        },
    },
    {
        "id": "food_banana", "cat": "food", "diff": "beginner",
        "img": img("photo-1587132137056-bfbf0166836e"),
        "d": [img("photo-1568702846914-96b305d2ead1"), img("photo-1560806887-1e4cd0b6cbd6")],
        "t": {
            "en": ["Banana", "bə.næn.ə"], "es": ["Plátano", "pla.ta.no"],
            "fr": ["Banane", "ba.nan"], "de": ["Banane", "ba.naː.nə"],
            "it": ["Banana", "ba.na.na"], "pt": ["Banana", "bɐ.nɐ.nɐ"],
        },
    },
    {
        "id": "food_bread", "cat": "food", "diff": "beginner",
        "img": img("photo-1509440159596-0249088772ff"),
        "d": [img("photo-1565299624946-b28f40a0ae38"), img("photo-1568702846914-96b305d2ead1")],
        "t": {
            "en": ["Bread", "brɛd"], "es": ["Pan", "pan"],
            "fr": ["Pain", "pɛ̃"], "de": ["Brot", "bʁoːt"],
            "it": ["Pane", "pa.ne"], "pt": ["Pão", "pɐ̃w̃"],
        },
    },
    {
        "id": "food_milk", "cat": "food", "diff": "beginner",
        "img": img("photo-1563636619-e9143da7973b"),
        "d": [img("photo-1509440159596-0249088772ff"), img("photo-1587132137056-bfbf0166836e")],
        "t": {
            "en": ["Milk", "mɪlk"], "es": ["Leche", "le.tʃe"],
            "fr": ["Lait", "lɛ"], "de": ["Milch", "mɪlç"],
            "it": ["Latte", "lat.te"], "pt": ["Leite", "lej.tʃi"],
        },
    },
    {
        "id": "food_egg", "cat": "food", "diff": "beginner",
        "img": img("photo-1582722872445-44dc5f7e3c8f"),
        "d": [img("photo-1563636619-e9143da7973b"), img("photo-1509440159596-0249088772ff")],
        "t": {
            "en": ["Egg", "ɛɡ"], "es": ["Huevo", "we.βo"],
            "fr": ["Œuf", "œf"], "de": ["Ei", "aɪ̯"],
            "it": ["Uovo", "wɔ.vo"], "pt": ["Ovo", "o.vu"],
        },
    },
    # ===================== FOOD - INTERMEDIATE =====================
    {
        "id": "food_pizza", "cat": "food", "diff": "intermediate",
        "img": img("photo-1565299624946-b28f40a0ae38"),
        "d": [img("photo-1568901346375-23c9450c58cd"), img("photo-1509440159596-0249088772ff")],
        "t": {
            "en": ["Pizza", "piːt.sə"], "es": ["Pizza", "pi.sa"],
            "fr": ["Pizza", "pid.za"], "de": ["Pizza", "pɪ.tsa"],
            "it": ["Pizza", "pit.tsa"], "pt": ["Pizza", "pi.zɐ"],
        },
    },
    {
        "id": "food_hamburger", "cat": "food", "diff": "intermediate",
        "img": img("photo-1568901346375-23c9450c58cd"),
        "d": [img("photo-1565299624946-b28f40a0ae38"), img("photo-1560806887-1e4cd0b6cbd6")],
        "t": {
            "en": ["Hamburger", "hæm.bɜː.ɡər"], "es": ["Hamburguesa", "am.buɾ.ɡe.sa"],
            "fr": ["Hamburger", "ɑ̃.buʁ.ɡœʁ"], "de": ["Hamburger", "ham.bʊʁ.ɡɐ"],
            "it": ["Hamburger", "am.buɾ.ɡeɾ"], "pt": ["Hambúrguer", "ɐ̃.buɾ.ɡeɾ"],
        },
    },
    {
        "id": "food_cheese", "cat": "food", "diff": "intermediate",
        "img": img("photo-1486297678162-eb2a19b0a32d"),
        "d": [img("photo-1509440159596-0249088772ff"), img("photo-1582722872445-44dc5f7e3c8f")],
        "t": {
            "en": ["Cheese", "tʃiːz"], "es": ["Queso", "ke.so"],
            "fr": ["Fromage", "fʁɔ.maʒ"], "de": ["Käse", "kɛː.zə"],
            "it": ["Formaggio", "for.mad.dʒo"], "pt": ["Queijo", "kej.ʒu"],
        },
    },
    {
        "id": "food_strawberry", "cat": "food", "diff": "intermediate",
        "img": img("photo-1464965911861-746a04b4bca6"),
        "d": [img("photo-1568702846914-96b305d2ead1"), img("photo-1587132137056-bfbf0166836e")],
        "t": {
            "en": ["Strawberry", "strɔː.bər.i"], "es": ["Fresa", "fɾe.sa"],
            "fr": ["Fraise", "fʁɛz"], "de": ["Erdbeere", "eːɐ̯t.beː.ʁə"],
            "it": ["Fragola", "fra.ɡo.la"], "pt": ["Morango", "mu.ɾɐ̃.ɡu"],
        },
    },
    {
        "id": "food_watermelon", "cat": "food", "diff": "intermediate",
        "img": img("photo-1563114773-84221bd62daa"),
        "d": [img("photo-1464965911861-746a04b4bca6"), img("photo-1568702846914-96b305d2ead1")],
        "t": {
            "en": ["Watermelon", "wɔː.tər.mel.ən"], "es": ["Sandía", "san.di.a"],
            "fr": ["Pastèque", "pas.tɛk"], "de": ["Wassermelone", "va.sɐ.me.loː.nə"],
            "it": ["Anguria", "aŋ.ɡu.ri.a"], "pt": ["Melancia", "me.lɐ̃.si.ɐ"],
        },
    },
    # ===================== FOOD - ADVANCED =====================
    {
        "id": "food_avocado", "cat": "food", "diff": "advanced",
        "img": img("photo-1523049673857-eb18f1d7b578"),
        "d": [img("photo-1563114773-84221bd62daa"), img("photo-1464965911861-746a04b4bca6")],
        "t": {
            "en": ["Avocado", "æv.ə.kɑː.doʊ"], "es": ["Aguacate", "a.ɣwa.ka.te"],
            "fr": ["Avocat", "a.vɔ.ka"], "de": ["Avocado", "a.vo.kaː.do"],
            "it": ["Avocado", "a.vo.ka.do"], "pt": ["Abacate", "a.bɐ.ka.tɨ"],
        },
    },
    {
        "id": "food_pineapple", "cat": "food", "diff": "advanced",
        "img": img("photo-1550258987-190a2d41a8ba"),
        "d": [img("photo-1523049673857-eb18f1d7b578"), img("photo-1563114773-84221bd62daa")],
        "t": {
            "en": ["Pineapple", "paɪn.æp.l̩"], "es": ["Piña", "pi.ɲa"],
            "fr": ["Ananas", "a.na.nas"], "de": ["Ananas", "a.na.nas"],
            "it": ["Ananas", "a.na.nas"], "pt": ["Abacaxi", "a.bɐ.ka.ʃi"],
        },
    },
    {
        "id": "food_croissant", "cat": "food", "diff": "advanced",
        "img": img("photo-1555507036-ab1f4038024a"),
        "d": [img("photo-1509440159596-0249088772ff"), img("photo-1486297678162-eb2a19b0a32d")],
        "t": {
            "en": ["Croissant", "kwɑː.sɒ̃"], "es": ["Cruasán", "kɾwa.san"],
            "fr": ["Croissant", "kʁwa.sɑ̃"], "de": ["Croissant", "kʁo.asɑ̃"],
            "it": ["Cornetto", "kor.net.to"], "pt": ["Croissant", "kɾwa.sɐ̃"],
        },
    },
    # ===================== COLORS - BEGINNER =====================
    {
        "id": "colors_red", "cat": "colors", "diff": "beginner",
        "img": img("photo-1562886877-aaaa5c16396e"),
        "d": [img("photo-1557682250-33bd709cbe85"), img("photo-1579546929518-9e396f3cc809")],
        "t": {
            "en": ["Red", "rɛd"], "es": ["Rojo", "ro.xo"],
            "fr": ["Rouge", "ʁuʒ"], "de": ["Rot", "ʁoːt"],
            "it": ["Rosso", "ros.so"], "pt": ["Vermelho", "veɾ.me.ʎu"],
        },
    },
    {
        "id": "colors_blue", "cat": "colors", "diff": "beginner",
        "img": img("photo-1557682250-33bd709cbe85"),
        "d": [img("photo-1562886877-aaaa5c16396e"), img("photo-1557682224-5b8590cd9ec5")],
        "t": {
            "en": ["Blue", "bluː"], "es": ["Azul", "a.θul"],
            "fr": ["Bleu", "blø"], "de": ["Blau", "blaʊ̯"],
            "it": ["Blu", "blu"], "pt": ["Azul", "ɐ.zuw"],
        },
    },
    {
        "id": "colors_green", "cat": "colors", "diff": "beginner",
        "img": img("photo-1557682224-5b8590cd9ec5"),
        "d": [img("photo-1557682250-33bd709cbe85"), img("photo-1562886877-aaaa5c16396e")],
        "t": {
            "en": ["Green", "ɡriːn"], "es": ["Verde", "beɾ.ðe"],
            "fr": ["Vert", "vɛʁ"], "de": ["Grün", "ɡʁyːn"],
            "it": ["Verde", "ver.de"], "pt": ["Verde", "veɾ.dɨ"],
        },
    },
    {
        "id": "colors_yellow", "cat": "colors", "diff": "beginner",
        "img": img("photo-1579546929518-9e396f3cc809"),
        "d": [img("photo-1557682224-5b8590cd9ec5"), img("photo-1562886877-aaaa5c16396e")],
        "t": {
            "en": ["Yellow", "jɛl.oʊ"], "es": ["Amarillo", "a.ma.ɾi.ʎo"],
            "fr": ["Jaune", "ʒon"], "de": ["Gelb", "ɡɛlp"],
            "it": ["Giallo", "dʒal.lo"], "pt": ["Amarelo", "ɐ.mɐ.ɾe.lu"],
        },
    },
    {
        "id": "colors_white", "cat": "colors", "diff": "beginner",
        "img": img("photo-1533628635777-112b2239b1c7"),
        "d": [img("photo-1579546929518-9e396f3cc809"), img("photo-1557682250-33bd709cbe85")],
        "t": {
            "en": ["White", "waɪt"], "es": ["Blanco", "blaŋ.ko"],
            "fr": ["Blanc", "blɑ̃"], "de": ["Weiß", "vaɪ̯s"],
            "it": ["Bianco", "bjaŋ.ko"], "pt": ["Branco", "bɾɐ̃.ku"],
        },
    },
    # ===================== COLORS - INTERMEDIATE =====================
    {
        "id": "colors_orange", "cat": "colors", "diff": "intermediate",
        "img": img("photo-1557682260-96773eb01377"),
        "d": [img("photo-1562886877-aaaa5c16396e"), img("photo-1579546929518-9e396f3cc809")],
        "t": {
            "en": ["Orange", "ɒr.ɪndʒ"], "es": ["Naranja", "na.ɾaŋ.xa"],
            "fr": ["Orange", "ɔ.ʁɑ̃ʒ"], "de": ["Orange", "o.ʁɑ̃ːʒ"],
            "it": ["Arancione", "a.ran.tʃo.ne"], "pt": ["Laranja", "lɐ.ɾɐ̃.ʒɐ"],
        },
    },
    {
        "id": "colors_purple", "cat": "colors", "diff": "intermediate",
        "img": img("photo-1557682268-e3955ed5d83f"),
        "d": [img("photo-1557682250-33bd709cbe85"), img("photo-1562886877-aaaa5c16396e")],
        "t": {
            "en": ["Purple", "pɜːr.pl̩"], "es": ["Morado", "mo.ɾa.ðo"],
            "fr": ["Violet", "vjɔ.lɛ"], "de": ["Lila", "liː.la"],
            "it": ["Viola", "vi.o.la"], "pt": ["Roxo", "ʁo.ʃu"],
        },
    },
    {
        "id": "colors_pink", "cat": "colors", "diff": "intermediate",
        "img": img("photo-1557682233-43e671455dfa"),
        "d": [img("photo-1557682268-e3955ed5d83f"), img("photo-1562886877-aaaa5c16396e")],
        "t": {
            "en": ["Pink", "pɪŋk"], "es": ["Rosa", "ro.sa"],
            "fr": ["Rose", "ʁoz"], "de": ["Rosa", "ʁoː.za"],
            "it": ["Rosa", "rɔ.za"], "pt": ["Rosa", "ʁɔ.zɐ"],
        },
    },
    # ===================== COLORS - ADVANCED =====================
    {
        "id": "colors_turquoise", "cat": "colors", "diff": "advanced",
        "img": img("photo-1520454974749-611b7248ffdb"),
        "d": [img("photo-1557682250-33bd709cbe85"), img("photo-1557682224-5b8590cd9ec5")],
        "t": {
            "en": ["Turquoise", "tɜːr.kwɔɪz"], "es": ["Turquesa", "tuɾ.ke.sa"],
            "fr": ["Turquoise", "tyʁ.kwaz"], "de": ["Türkis", "tʏʁ.kiːs"],
            "it": ["Turchese", "tuɾ.ke.ze"], "pt": ["Turquesa", "tuɾ.ke.zɐ"],
        },
    },
    {
        "id": "colors_maroon", "cat": "colors", "diff": "advanced",
        "img": img("photo-1558618666-fcd25c85f82e"),
        "d": [img("photo-1562886877-aaaa5c16396e"), img("photo-1557682268-e3955ed5d83f")],
        "t": {
            "en": ["Maroon", "mə.ruːn"], "es": ["Granate", "ɡɾa.na.te"],
            "fr": ["Bordeaux", "bɔʁ.do"], "de": ["Kastanienbraun", "kas.ta.ni.ən.bʁaʊ̯n"],
            "it": ["Marrone scuro", "mar.ro.ne sku.ro"], "pt": ["Castanho", "kɐʃ.tɐ.ɲu"],
        },
    },
    # ===================== BODY - BEGINNER =====================
    {
        "id": "body_hand", "cat": "body", "diff": "beginner",
        "img": img("photo-1577896851231-70ef18881754"),
        "d": [img("photo-1583121274602-3e2820c69888"), img("photo-1544367567-0f2fcb009e0b")],
        "t": {
            "en": ["Hand", "hænd"], "es": ["Mano", "ma.no"],
            "fr": ["Main", "mɛ̃"], "de": ["Hand", "hant"],
            "it": ["Mano", "ma.no"], "pt": ["Mão", "mɐ̃w̃"],
        },
    },
    {
        "id": "body_eye", "cat": "body", "diff": "beginner",
        "img": img("photo-1583121274602-3e2820c69888"),
        "d": [img("photo-1577896851231-70ef18881754"), img("photo-1588776814546-1ffcf47267a5")],
        "t": {
            "en": ["Eye", "aɪ"], "es": ["Ojo", "o.xo"],
            "fr": ["Œil", "œj"], "de": ["Auge", "aʊ̯.ɡə"],
            "it": ["Occhio", "ok.kjo"], "pt": ["Olho", "o.ʎu"],
        },
    },
    {
        "id": "body_mouth", "cat": "body", "diff": "beginner",
        "img": img("photo-1588776814546-1ffcf47267a5"),
        "d": [img("photo-1583121274602-3e2820c69888"), img("photo-1577896851231-70ef18881754")],
        "t": {
            "en": ["Mouth", "maʊθ"], "es": ["Boca", "bo.ka"],
            "fr": ["Bouche", "buʃ"], "de": ["Mund", "mʊnt"],
            "it": ["Bocca", "bok.ka"], "pt": ["Boca", "bo.kɐ"],
        },
    },
    {
        "id": "body_ear", "cat": "body", "diff": "beginner",
        "img": img("photo-1511367461989-f85a21fda167"),
        "d": [img("photo-1583121274602-3e2820c69888"), img("photo-1588776814546-1ffcf47267a5")],
        "t": {
            "en": ["Ear", "ɪər"], "es": ["Oreja", "o.ɾe.xa"],
            "fr": ["Oreille", "ɔ.ʁɛj"], "de": ["Ohr", "oːɐ̯"],
            "it": ["Orecchio", "o.rek.kjo"], "pt": ["Orelha", "o.ɾe.ʎɐ"],
        },
    },
    {
        "id": "body_nose", "cat": "body", "diff": "beginner",
        "img": img("photo-1544367567-0f2fcb009e0b"),
        "d": [img("photo-1511367461989-f85a21fda167"), img("photo-1588776814546-1ffcf47267a5")],
        "t": {
            "en": ["Nose", "noʊz"], "es": ["Nariz", "na.ɾiθ"],
            "fr": ["Nez", "ne"], "de": ["Nase", "naː.zə"],
            "it": ["Naso", "na.zo"], "pt": ["Nariz", "nɐ.ɾiʃ"],
        },
    },
    # ===================== BODY - INTERMEDIATE =====================
    {
        "id": "body_shoulder", "cat": "body", "diff": "intermediate",
        "img": img("photo-1571019613454-1cb2f99b2d8b"),
        "d": [img("photo-1577896851231-70ef18881754"), img("photo-1544367567-0f2fcb009e0b")],
        "t": {
            "en": ["Shoulder", "ʃoʊl.dər"], "es": ["Hombro", "om.bɾo"],
            "fr": ["Épaule", "e.pol"], "de": ["Schulter", "ʃʊl.tɐ"],
            "it": ["Spalla", "spal.la"], "pt": ["Ombro", "õ.bɾu"],
        },
    },
    {
        "id": "body_knee", "cat": "body", "diff": "intermediate",
        "img": img("photo-1571019614242-c5c5dee9f50b"),
        "d": [img("photo-1571019613454-1cb2f99b2d8b"), img("photo-1577896851231-70ef18881754")],
        "t": {
            "en": ["Knee", "niː"], "es": ["Rodilla", "ro.ði.ʎa"],
            "fr": ["Genou", "ʒə.nu"], "de": ["Knie", "kniː"],
            "it": ["Ginocchio", "dʒi.nok.kjo"], "pt": ["Joelho", "ʒu.e.ʎu"],
        },
    },
    # ===================== BODY - ADVANCED =====================
    {
        "id": "body_elbow", "cat": "body", "diff": "advanced",
        "img": img("photo-1571019613576-2b22c76fd955"),
        "d": [img("photo-1571019614242-c5c5dee9f50b"), img("photo-1571019613454-1cb2f99b2d8b")],
        "t": {
            "en": ["Elbow", "ɛl.boʊ"], "es": ["Codo", "ko.ðo"],
            "fr": ["Coude", "kud"], "de": ["Ellbogen", "ɛl.boː.ɡn̩"],
            "it": ["Gomito", "ɡo.mi.to"], "pt": ["Cotovelo", "ko.tu.ve.lu"],
        },
    },
    {
        "id": "body_ankle", "cat": "body", "diff": "advanced",
        "img": img("photo-1562771379-eafdca7a02f8"),
        "d": [img("photo-1571019614242-c5c5dee9f50b"), img("photo-1571019613576-2b22c76fd955")],
        "t": {
            "en": ["Ankle", "æŋ.kl̩"], "es": ["Tobillo", "to.βi.ʎo"],
            "fr": ["Cheville", "ʃə.vij"], "de": ["Knöchel", "knœ.çl̩"],
            "it": ["Caviglia", "ka.vi.ʎa"], "pt": ["Tornozelo", "toɾ.no.ze.lu"],
        },
    },
    # ===================== CLOTHING - BEGINNER =====================
    {
        "id": "clothing_shirt", "cat": "clothing", "diff": "beginner",
        "img": img("photo-1596755094514-f87e34085b2c"),
        "d": [img("photo-1542272604-787c3835535d"), img("photo-1549298916-b41d501d3772")],
        "t": {
            "en": ["Shirt", "ʃɜːrt"], "es": ["Camisa", "ka.mi.sa"],
            "fr": ["Chemise", "ʃə.miz"], "de": ["Hemd", "hɛmt"],
            "it": ["Camicia", "ka.mi.tʃa"], "pt": ["Camisa", "kɐ.mi.zɐ"],
        },
    },
    {
        "id": "clothing_shoes", "cat": "clothing", "diff": "beginner",
        "img": img("photo-1549298916-b41d501d3772"),
        "d": [img("photo-1596755094514-f87e34085b2c"), img("photo-1521369909029-2afed882baee")],
        "t": {
            "en": ["Shoes", "ʃuːz"], "es": ["Zapatos", "θa.pa.tos"],
            "fr": ["Chaussures", "ʃo.syʁ"], "de": ["Schuhe", "ʃuː.ə"],
            "it": ["Scarpe", "skar.pe"], "pt": ["Sapatos", "sɐ.pa.tuʃ"],
        },
    },
    {
        "id": "clothing_hat", "cat": "clothing", "diff": "beginner",
        "img": img("photo-1521369909029-2afed882baee"),
        "d": [img("photo-1596755094514-f87e34085b2c"), img("photo-1549298916-b41d501d3772")],
        "t": {
            "en": ["Hat", "hæt"], "es": ["Sombrero", "som.bɾe.ɾo"],
            "fr": ["Chapeau", "ʃa.po"], "de": ["Hut", "huːt"],
            "it": ["Cappello", "kap.pel.lo"], "pt": ["Chapéu", "ʃɐ.pɛw"],
        },
    },
    {
        "id": "clothing_pants", "cat": "clothing", "diff": "beginner",
        "img": img("photo-1542272604-787c3835535d"),
        "d": [img("photo-1596755094514-f87e34085b2c"), img("photo-1521369909029-2afed882baee")],
        "t": {
            "en": ["Pants", "pænts"], "es": ["Pantalones", "pan.ta.lo.nes"],
            "fr": ["Pantalon", "pɑ̃.ta.lɔ̃"], "de": ["Hose", "hoː.zə"],
            "it": ["Pantaloni", "pan.ta.lo.ni"], "pt": ["Calças", "kaw.sɐʃ"],
        },
    },
    {
        "id": "clothing_dress", "cat": "clothing", "diff": "beginner",
        "img": img("photo-1595777457583-95e059d581b8"),
        "d": [img("photo-1596755094514-f87e34085b2c"), img("photo-1542272604-787c3835535d")],
        "t": {
            "en": ["Dress", "drɛs"], "es": ["Vestido", "bes.ti.ðo"],
            "fr": ["Robe", "ʁɔb"], "de": ["Kleid", "klaɪ̯t"],
            "it": ["Vestito", "ves.ti.to"], "pt": ["Vestido", "vɨʃ.ti.du"],
        },
    },
