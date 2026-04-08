#!/usr/bin/env python3
"""Seed new language learning words with verified Unsplash images."""
import json, subprocess, time

REGION = "us-east-1"
TIMESTAMP = str(int(time.time() * 1000))

# Each word: (english, category, difficulty, imageUrl, distractors, translations)
# translations: {lang: {word, pronunciation}}
WORDS = [
    # ── ANIMALS (beginner) ──
    ("horse", "animals", "beginner",
     "photo-1553284965-83fd3e82fa5a", ["photo-1425082661705-1834bfd09dca", "photo-1549366021-9f761d450615"],
     {"es":("caballo","/kaˈβa.ʎo/"),"pt":("cavalo","/kɐˈva.lu/"),"fr":("cheval","/ʃə.val/"),"de":("Pferd","/pfeːɐ̯t/"),"it":("cavallo","/kaˈval.lo/"),"el":("άλογο","/ˈa.lo.ɣo/"),"en":("horse","/hɔːrs/")}),
    ("cow", "animals", "beginner",
     "photo-1570042225831-d98fa7577f1e", ["photo-1553284965-83fd3e82fa5a", "photo-1425082661705-1834bfd09dca"],
     {"es":("vaca","/ˈba.ka/"),"pt":("vaca","/ˈva.kɐ/"),"fr":("vache","/vaʃ/"),"de":("Kuh","/kuː/"),"it":("mucca","/ˈmuk.ka/"),"el":("αγελάδα","/a.ʝeˈla.ða/"),"en":("cow","/kaʊ/")}),
    ("pig", "animals", "beginner",
     "photo-1516467508483-a7212febe31a", ["photo-1570042225831-d98fa7577f1e", "photo-1553284965-83fd3e82fa5a"],
     {"es":("cerdo","/ˈθeɾ.ðo/"),"pt":("porco","/ˈpoɾ.ku/"),"fr":("cochon","/kɔ.ʃɔ̃/"),"de":("Schwein","/ʃvaɪ̯n/"),"it":("maiale","/maˈja.le/"),"el":("γουρούνι","/ɣuˈru.ni/"),"en":("pig","/pɪɡ/")}),
    ("sheep", "animals", "beginner",
     "photo-1484557985045-edf25e08da73", ["photo-1516467508483-a7212febe31a", "photo-1570042225831-d98fa7577f1e"],
     {"es":("oveja","/oˈβe.xa/"),"pt":("ovelha","/oˈve.ʎɐ/"),"fr":("mouton","/mu.tɔ̃/"),"de":("Schaf","/ʃaːf/"),"it":("pecora","/ˈpɛ.ko.ra/"),"el":("πρόβατο","/ˈpro.va.to/"),"en":("sheep","/ʃiːp/")}),
    ("duck", "animals", "beginner",
     "photo-1459682687441-7761439a709d", ["photo-1484557985045-edf25e08da73", "photo-1516467508483-a7212febe31a"],
     {"es":("pato","/ˈpa.to/"),"pt":("pato","/ˈpa.tu/"),"fr":("canard","/ka.naʁ/"),"de":("Ente","/ˈɛn.tə/"),"it":("anatra","/ˈa.na.tra/"),"el":("πάπια","/ˈpa.pja/"),"en":("duck","/dʌk/")}),
    ("turtle", "animals", "beginner",
     "photo-1437622368342-7a3d73a34c8f", ["photo-1459682687441-7761439a709d", "photo-1484557985045-edf25e08da73"],
     {"es":("tortuga","/toɾˈtu.ɣa/"),"pt":("tartaruga","/taɾ.tɐˈɾu.ɡɐ/"),"fr":("tortue","/tɔʁ.ty/"),"de":("Schildkröte","/ˈʃɪlt.krøː.tə/"),"it":("tartaruga","/tar.taˈru.ɡa/"),"el":("χελώνα","/çeˈlo.na/"),"en":("turtle","/ˈtɜːr.tl̩/")}),
    ("frog", "animals", "beginner",
     "photo-1474314170901-f351b68f544f", ["photo-1437622368342-7a3d73a34c8f", "photo-1459682687441-7761439a709d"],
     {"es":("rana","/ˈra.na/"),"pt":("sapo","/ˈsa.pu/"),"fr":("grenouille","/ɡʁə.nuj/"),"de":("Frosch","/fʁɔʃ/"),"it":("rana","/ˈra.na/"),"el":("βάτραχος","/ˈva.tra.xos/"),"en":("frog","/frɒɡ/")}),
    ("penguin", "animals", "intermediate",
     "photo-1462888210965-cdf193fb74de", ["photo-1474314170901-f351b68f544f", "photo-1437622368342-7a3d73a34c8f"],
     {"es":("pingüino","/piŋˈɡwi.no/"),"pt":("pinguim","/pĩˈɡĩ/"),"fr":("pingouin","/pɛ̃.ɡwɛ̃/"),"de":("Pinguin","/ˈpɪŋ.ɡu.iːn/"),"it":("pinguino","/pinˈɡwi.no/"),"el":("πιγκουίνος","/piŋ.ɡuˈi.nos/"),"en":("penguin","/ˈpɛŋ.ɡwɪn/")}),
    ("giraffe", "animals", "intermediate",
     "photo-1547721064-da6cfb341d50", ["photo-1462888210965-cdf193fb74de", "photo-1549366021-9f761d450615"],
     {"es":("jirafa","/xiˈɾa.fa/"),"pt":("girafa","/ʒiˈɾa.fɐ/"),"fr":("girafe","/ʒi.ʁaf/"),"de":("Giraffe","/ɡiˈʁa.fə/"),"it":("giraffa","/dʒiˈraf.fa/"),"el":("καμηλοπάρδαλη","/ka.mi.loˈpar.ða.li/"),"en":("giraffe","/dʒɪˈræf/")}),
    ("dolphin", "animals", "intermediate",
     "photo-1607153333879-c174d265f1d2", ["photo-1547721064-da6cfb341d50", "photo-1462888210965-cdf193fb74de"],
     {"es":("delfín","/delˈfin/"),"pt":("golfinho","/ɡolˈfi.ɲu/"),"fr":("dauphin","/do.fɛ̃/"),"de":("Delfin","/dɛlˈfiːn/"),"it":("delfino","/delˈfi.no/"),"el":("δελφίνι","/ðelˈfi.ni/"),"en":("dolphin","/ˈdɒl.fɪn/")}),
    ("owl", "animals", "intermediate",
     "photo-1543549790-8b5f4a028cfb", ["photo-1607153333879-c174d265f1d2", "photo-1547721064-da6cfb341d50"],
     {"es":("búho","/ˈbu.o/"),"pt":("coruja","/koˈɾu.ʒɐ/"),"fr":("hibou","/i.bu/"),"de":("Eule","/ˈɔʏ̯.lə/"),"it":("gufo","/ˈɡu.fo/"),"el":("κουκουβάγια","/ku.kuˈva.ʝa/"),"en":("owl","/aʊl/")}),
    ("bear", "animals", "intermediate",
     "photo-1525382455947-f319bc05fb35", ["photo-1543549790-8b5f4a028cfb", "photo-1607153333879-c174d265f1d2"],
     {"es":("oso","/ˈo.so/"),"pt":("urso","/ˈuɾ.su/"),"fr":("ours","/uʁs/"),"de":("Bär","/bɛːɐ̯/"),"it":("orso","/ˈor.so/"),"el":("αρκούδα","/arˈku.ða/"),"en":("bear","/bɛr/")}),
    # ── FOOD (beginner) ──
    ("orange", "food_drinks", "beginner",
     "photo-1547514701-42782101795e", ["photo-1550583724-b2692b85b150", "photo-1559496417-e7f25cb247f3"],
     {"es":("naranja","/naˈɾan.xa/"),"pt":("laranja","/lɐˈɾɐ̃.ʒɐ/"),"fr":("orange","/ɔ.ʁɑ̃ʒ/"),"de":("Orange","/oˈʁɑ̃ː.ʒə/"),"it":("arancia","/aˈran.tʃa/"),"el":("πορτοκάλι","/por.toˈka.li/"),"en":("orange","/ˈɒr.ɪndʒ/")}),
    ("grape", "food_drinks", "beginner",
     "photo-1537640538966-79f369143f8f", ["photo-1547514701-42782101795e", "photo-1550583724-b2692b85b150"],
     {"es":("uva","/ˈu.βa/"),"pt":("uva","/ˈu.vɐ/"),"fr":("raisin","/ʁɛ.zɛ̃/"),"de":("Traube","/ˈtʁaʊ̯.bə/"),"it":("uva","/ˈu.va/"),"el":("σταφύλι","/staˈfi.li/"),"en":("grape","/ɡreɪp/")}),
    ("watermelon", "food_drinks", "beginner",
     "photo-1563114773-84221bd62daa", ["photo-1537640538966-79f369143f8f", "photo-1547514701-42782101795e"],
     {"es":("sandía","/sanˈdi.a/"),"pt":("melancia","/me.lɐ̃ˈsi.ɐ/"),"fr":("pastèque","/pas.tɛk/"),"de":("Wassermelone","/ˈva.sɐ.me.loː.nə/"),"it":("anguria","/anˈɡu.rja/"),"el":("καρπούζι","/karˈpu.zi/"),"en":("watermelon","/ˈwɔː.tər.mel.ən/")}),
    ("egg", "food_drinks", "beginner",
     "photo-1582722872445-44dc5f7e3c8f", ["photo-1563114773-84221bd62daa", "photo-1537640538966-79f369143f8f"],
     {"es":("huevo","/ˈwe.βo/"),"pt":("ovo","/ˈo.vu/"),"fr":("œuf","/œf/"),"de":("Ei","/aɪ̯/"),"it":("uovo","/ˈwɔ.vo/"),"el":("αυγό","/avˈɣo/"),"en":("egg","/ɛɡ/")}),
    ("milk", "food_drinks", "beginner",
     "photo-1550583724-b2692b85b150", ["photo-1582722872445-44dc5f7e3c8f", "photo-1563114773-84221bd62daa"],
     {"es":("leche","/ˈle.tʃe/"),"pt":("leite","/ˈlej.tʃi/"),"fr":("lait","/lɛ/"),"de":("Milch","/mɪlç/"),"it":("latte","/ˈlat.te/"),"el":("γάλα","/ˈɣa.la/"),"en":("milk","/mɪlk/")}),
    ("pizza", "food_drinks", "beginner",
     "photo-1565299624946-b28f40a0ae38", ["photo-1550583724-b2692b85b150", "photo-1582722872445-44dc5f7e3c8f"],
     {"es":("pizza","/ˈpi.θa/"),"pt":("pizza","/ˈpi.tsɐ/"),"fr":("pizza","/pid.za/"),"de":("Pizza","/ˈpɪ.t͡sa/"),"it":("pizza","/ˈpit.tsa/"),"el":("πίτσα","/ˈpi.tsa/"),"en":("pizza","/ˈpiːt.sə/")}),
    ("ice cream", "food_drinks", "beginner",
     "photo-1497034825429-c343d7c6a68f", ["photo-1565299624946-b28f40a0ae38", "photo-1550583724-b2692b85b150"],
     {"es":("helado","/eˈla.ðo/"),"pt":("sorvete","/soɾˈve.tʃi/"),"fr":("glace","/ɡlas/"),"de":("Eis","/aɪ̯s/"),"it":("gelato","/dʒeˈla.to/"),"el":("παγωτό","/pa.ɣoˈto/"),"en":("ice cream","/aɪs kriːm/")}),
    # ── OBJECTS (beginner) ──
    ("hat", "objects", "beginner",
     "photo-1521369909029-2afed882baee", ["photo-1544947950-fa07a98d237f", "photo-1497633762265-9d179a990aa6"],
     {"es":("sombrero","/somˈbɾe.ɾo/"),"pt":("chapéu","/ʃɐˈpɛw/"),"fr":("chapeau","/ʃa.po/"),"de":("Hut","/huːt/"),"it":("cappello","/kapˈpɛl.lo/"),"el":("καπέλο","/kaˈpe.lo/"),"en":("hat","/hæt/")}),
    ("shoe", "objects", "beginner",
     "photo-1542291026-7eec264c27ff", ["photo-1521369909029-2afed882baee", "photo-1544947950-fa07a98d237f"],
     {"es":("zapato","/θaˈpa.to/"),"pt":("sapato","/sɐˈpa.tu/"),"fr":("chaussure","/ʃo.syʁ/"),"de":("Schuh","/ʃuː/"),"it":("scarpa","/ˈskar.pa/"),"el":("παπούτσι","/paˈpu.tsi/"),"en":("shoe","/ʃuː/")}),
    ("ball", "objects", "beginner",
     "photo-1518091043644-c1d4457512c6", ["photo-1542291026-7eec264c27ff", "photo-1521369909029-2afed882baee"],
     {"es":("pelota","/peˈlo.ta/"),"pt":("bola","/ˈbɔ.lɐ/"),"fr":("ballon","/ba.lɔ̃/"),"de":("Ball","/bal/"),"it":("palla","/ˈpal.la/"),"el":("μπάλα","/ˈba.la/"),"en":("ball","/bɔːl/")}),
    ("guitar", "objects", "intermediate",
     "photo-1510915361894-db8b60106cb1", ["photo-1518091043644-c1d4457512c6", "photo-1542291026-7eec264c27ff"],
     {"es":("guitarra","/ɡiˈta.ra/"),"pt":("guitarra","/ɡiˈta.ʁɐ/"),"fr":("guitare","/ɡi.taʁ/"),"de":("Gitarre","/ɡiˈta.ʁə/"),"it":("chitarra","/kiˈtar.ra/"),"el":("κιθάρα","/kiˈθa.ra/"),"en":("guitar","/ɡɪˈtɑːr/")}),
    ("lamp", "objects", "beginner",
     "photo-1513506003901-1e6a229e2d15", ["photo-1510915361894-db8b60106cb1", "photo-1518091043644-c1d4457512c6"],
     {"es":("lámpara","/ˈlam.pa.ɾa/"),"pt":("lâmpada","/ˈlɐ̃.pɐ.dɐ/"),"fr":("lampe","/lɑ̃p/"),"de":("Lampe","/ˈlam.pə/"),"it":("lampada","/ˈlam.pa.da/"),"el":("λάμπα","/ˈla.ba/"),"en":("lamp","/læmp/")}),
    ("cup", "objects", "beginner",
     "photo-1514228742587-6b1558fcca3d", ["photo-1513506003901-1e6a229e2d15", "photo-1510915361894-db8b60106cb1"],
     {"es":("taza","/ˈta.θa/"),"pt":("xícara","/ˈʃi.kɐ.ɾɐ/"),"fr":("tasse","/tas/"),"de":("Tasse","/ˈta.sə/"),"it":("tazza","/ˈtat.tsa/"),"el":("φλιτζάνι","/fliˈdza.ni/"),"en":("cup","/kʌp/")}),
    ("watch", "objects", "intermediate",
     "photo-1524592094714-0f0654e20314", ["photo-1514228742587-6b1558fcca3d", "photo-1513506003901-1e6a229e2d15"],
     {"es":("reloj","/reˈlox/"),"pt":("relógio","/ʁeˈlɔ.ʒju/"),"fr":("montre","/mɔ̃tʁ/"),"de":("Uhr","/uːɐ̯/"),"it":("orologio","/o.roˈlɔ.dʒo/"),"el":("ρολόι","/roˈlo.i/"),"en":("watch","/wɒtʃ/")}),
    # ── NATURE (beginner) ──
    ("star", "nature", "beginner",
     "photo-1519681393784-d120267933ba", ["photo-1470071459604-3b5ec3a7fe05", "photo-1504384308090-c894fdcc538d"],
     {"es":("estrella","/esˈtɾe.ʎa/"),"pt":("estrela","/iʃˈtɾe.lɐ/"),"fr":("étoile","/e.twal/"),"de":("Stern","/ʃtɛʁn/"),"it":("stella","/ˈstel.la/"),"el":("αστέρι","/aˈste.ri/"),"en":("star","/stɑːr/")}),
    ("snow", "nature", "beginner",
     "photo-1491002052546-bf38f186af56", ["photo-1519681393784-d120267933ba", "photo-1470071459604-3b5ec3a7fe05"],
     {"es":("nieve","/ˈnje.βe/"),"pt":("neve","/ˈne.vi/"),"fr":("neige","/nɛʒ/"),"de":("Schnee","/ʃneː/"),"it":("neve","/ˈne.ve/"),"el":("χιόνι","/ˈço.ni/"),"en":("snow","/snoʊ/")}),
    ("leaf", "nature", "beginner",
     "photo-1507003211169-0a1dd7228f2d", ["photo-1491002052546-bf38f186af56", "photo-1519681393784-d120267933ba"],
     {"es":("hoja","/ˈo.xa/"),"pt":("folha","/ˈfo.ʎɐ/"),"fr":("feuille","/fœj/"),"de":("Blatt","/blat/"),"it":("foglia","/ˈfɔʎ.ʎa/"),"el":("φύλλο","/ˈfi.lo/"),"en":("leaf","/liːf/")}),
    ("volcano", "nature", "advanced",
     "photo-1562095241-8c6714fd4178", ["photo-1507003211169-0a1dd7228f2d", "photo-1491002052546-bf38f186af56"],
     {"es":("volcán","/bolˈkan/"),"pt":("vulcão","/vuwˈkɐ̃w̃/"),"fr":("volcan","/vɔl.kɑ̃/"),"de":("Vulkan","/vʊlˈkaːn/"),"it":("vulcano","/vulˈka.no/"),"el":("ηφαίστειο","/iˈfe.sti.o/"),"en":("volcano","/vɒlˈkeɪ.noʊ/")}),
]

def make_url(photo_id):
    return f"https://images.unsplash.com/{photo_id}?w=300&h=300&fit=crop"

def seed_table(table_name):
    print(f"\n=== Seeding {table_name} ===")
    count = 0
    for eng, cat, diff, img_id, dist_ids, translations in WORDS:
        word_id = f"{cat}_{eng.replace(' ','_')}_{TIMESTAMP}"
        item = {
            "wordId": {"S": word_id},
            "languageCode": {"S": "multi"},
            "category": {"S": cat},
            "difficulty": {"S": diff},
            "imageUrl": {"S": make_url(img_id)},
            "distractorImages": {"L": [{"S": make_url(d)} for d in dist_ids]},
            "translations": {"M": {}},
            "createdAt": {"S": "2026-03-31T00:00:00.000Z"},
            "updatedAt": {"S": "2026-03-31T00:00:00.000Z"},
        }
        for lang, (word, pron) in translations.items():
            item["translations"]["M"][lang] = {"M": {"word": {"S": word}, "pronunciation": {"S": pron}}}

        r = subprocess.run(
            ["aws", "dynamodb", "put-item", "--table-name", table_name,
             "--item", json.dumps(item), "--region", REGION],
            capture_output=True, text=True
        )
        if r.returncode == 0:
            count += 1
            print(f"  ✓ {eng} ({cat}/{diff})")
        else:
            print(f"  ✗ {eng}: {r.stderr[:100]}")
    print(f"  Seeded {count}/{len(WORDS)} words")

# Verify images first
print("Verifying image URLs...")
all_ids = set()
for _, _, _, img_id, dist_ids, _ in WORDS:
    all_ids.add(img_id)
    all_ids.update(dist_ids)

broken = []
for pid in all_ids:
    url = make_url(pid)
    r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url], capture_output=True, text=True)
    if r.stdout.strip() != "200":
        broken.append(pid)
        print(f"  BROKEN: {pid}")

if broken:
    print(f"\n{len(broken)} broken URLs found! Fix before seeding.")
else:
    print(f"All {len(all_ids)} URLs verified OK!")
    seed_table("memory-game-language-words-dev")
    seed_table("memory-game-language-words-prod")
    print("\nDone!")
