#!/usr/bin/env python3
"""Seed batch 2 of language learning words."""
import json, subprocess, time

REGION = "us-east-1"
TIMESTAMP = str(int(time.time() * 1000))

def make_url(pid):
    return f"https://images.unsplash.com/{pid}?w=300&h=300&fit=crop"

WORDS = [
    # ── ANIMALS batch 2 ──
    ("monkey", "animals", "beginner",
     "photo-1540573133985-87b6da6d54a9", ["photo-1525382455947-f319bc05fb35", "photo-1543549790-8b5f4a028cfb"],
     {"es":("mono","/ˈmo.no/"),"pt":("macaco","/mɐˈka.ku/"),"fr":("singe","/sɛ̃ʒ/"),"de":("Affe","/ˈa.fə/"),"it":("scimmia","/ˈʃim.mja/"),"el":("μαϊμού","/ma.iˈmu/"),"en":("monkey","/ˈmʌŋ.ki/")}),
    ("snake", "animals", "intermediate",
     "photo-1531386151447-fd76ad50012f", ["photo-1540573133985-87b6da6d54a9", "photo-1474314170901-f351b68f544f"],
     {"es":("serpiente","/seɾˈpjen.te/"),"pt":("cobra","/ˈko.bɾɐ/"),"fr":("serpent","/sɛʁ.pɑ̃/"),"de":("Schlange","/ˈʃlaŋ.ə/"),"it":("serpente","/serˈpɛn.te/"),"el":("φίδι","/ˈfi.ði/"),"en":("snake","/sneɪk/")}),
    ("wolf", "animals", "intermediate",
     "photo-1504674900247-0877df9cc836", ["photo-1531386151447-fd76ad50012f", "photo-1525382455947-f319bc05fb35"],
     {"es":("lobo","/ˈlo.βo/"),"pt":("lobo","/ˈlo.bu/"),"fr":("loup","/lu/"),"de":("Wolf","/vɔlf/"),"it":("lupo","/ˈlu.po/"),"el":("λύκος","/ˈli.kos/"),"en":("wolf","/wʊlf/")}),
    ("parrot", "animals", "intermediate",
     "photo-1552728089-57bdde30beb3", ["photo-1543549790-8b5f4a028cfb", "photo-1540573133985-87b6da6d54a9"],
     {"es":("loro","/ˈlo.ɾo/"),"pt":("papagaio","/pɐ.pɐˈɡaj.u/"),"fr":("perroquet","/pɛ.ʁɔ.kɛ/"),"de":("Papagei","/pa.paˈɡaɪ̯/"),"it":("pappagallo","/pap.paˈɡal.lo/"),"el":("παπαγάλος","/pa.paˈɣa.los/"),"en":("parrot","/ˈpær.ət/")}),
    ("whale", "animals", "advanced",
     "photo-1568430462989-44163eb1752f", ["photo-1607153333879-c174d265f1d2", "photo-1552728089-57bdde30beb3"],
     {"es":("ballena","/baˈʎe.na/"),"pt":("baleia","/bɐˈlɐj.ɐ/"),"fr":("baleine","/ba.lɛn/"),"de":("Wal","/vaːl/"),"it":("balena","/baˈle.na/"),"el":("φάλαινα","/ˈfa.le.na/"),"en":("whale","/weɪl/")}),
    ("crocodile", "animals", "advanced",
     "photo-1585095595205-e68428a9e205", ["photo-1568430462989-44163eb1752f", "photo-1531386151447-fd76ad50012f"],
     {"es":("cocodrilo","/ko.koˈðɾi.lo/"),"pt":("crocodilo","/kɾo.koˈdi.lu/"),"fr":("crocodile","/kʁɔ.kɔ.dil/"),"de":("Krokodil","/kʁo.koˈdiːl/"),"it":("coccodrillo","/kok.koˈdril.lo/"),"el":("κροκόδειλος","/kroˈko.ði.los/"),"en":("crocodile","/ˈkrɒk.ə.daɪl/")}),
    ("zebra", "animals", "intermediate",
     "photo-1526095179574-86e545346ae6", ["photo-1547721064-da6cfb341d50", "photo-1549366021-9f761d450615"],
     {"es":("cebra","/ˈθe.βɾa/"),"pt":("zebra","/ˈze.bɾɐ/"),"fr":("zèbre","/zɛbʁ/"),"de":("Zebra","/ˈtseː.bʁa/"),"it":("zebra","/ˈdzɛ.bra/"),"el":("ζέβρα","/ˈze.vra/"),"en":("zebra","/ˈziː.brə/")}),
    ("squirrel", "animals", "advanced",
     "photo-1507666405895-422eee7d517f", ["photo-1540573133985-87b6da6d54a9", "photo-1552728089-57bdde30beb3"],
     {"es":("ardilla","/aɾˈði.ʎa/"),"pt":("esquilo","/iʃˈki.lu/"),"fr":("écureuil","/e.ky.ʁœj/"),"de":("Eichhörnchen","/ˈaɪ̯ç.hœʁn.çən/"),"it":("scoiattolo","/sko.ˈjat.to.lo/"),"el":("σκίουρος","/ˈski.u.ros/"),"en":("squirrel","/ˈskwɪr.əl/")}),
    # ── FOOD batch 2 ──
    ("tomato", "food_drinks", "beginner",
     "photo-1555939594-58d7cb561ad1", ["photo-1565299624946-b28f40a0ae38", "photo-1563114773-84221bd62daa"],
     {"es":("tomate","/toˈma.te/"),"pt":("tomate","/toˈma.tʃi/"),"fr":("tomate","/tɔ.mat/"),"de":("Tomate","/toˈmaː.tə/"),"it":("pomodoro","/po.moˈdɔ.ro/"),"el":("ντομάτα","/doˈma.ta/"),"en":("tomato","/təˈmeɪ.toʊ/")}),
    ("carrot", "food_drinks", "beginner",
     "photo-1598170845058-32b9d6a5da37", ["photo-1555939594-58d7cb561ad1", "photo-1537640538966-79f369143f8f"],
     {"es":("zanahoria","/θa.naˈo.ɾja/"),"pt":("cenoura","/seˈno(w).ɾɐ/"),"fr":("carotte","/ka.ʁɔt/"),"de":("Karotte","/kaˈʁɔ.tə/"),"it":("carota","/kaˈrɔ.ta/"),"el":("καρότο","/kaˈro.to/"),"en":("carrot","/ˈkær.ət/")}),
    ("cake", "food_drinks", "beginner",
     "photo-1578985545062-69928b1d9587", ["photo-1497034825429-c343d7c6a68f", "photo-1565299624946-b28f40a0ae38"],
     {"es":("pastel","/pasˈtel/"),"pt":("bolo","/ˈbo.lu/"),"fr":("gâteau","/ɡɑ.to/"),"de":("Kuchen","/ˈkuː.xən/"),"it":("torta","/ˈtor.ta/"),"el":("κέικ","/keik/"),"en":("cake","/keɪk/")}),
    ("chocolate", "food_drinks", "intermediate",
     "photo-1481391319762-47dff72954d9", ["photo-1578985545062-69928b1d9587", "photo-1497034825429-c343d7c6a68f"],
     {"es":("chocolate","/tʃo.koˈla.te/"),"pt":("chocolate","/ʃo.koˈla.tʃi/"),"fr":("chocolat","/ʃɔ.kɔ.la/"),"de":("Schokolade","/ʃo.koˈlaː.də/"),"it":("cioccolato","/tʃok.koˈla.to/"),"el":("σοκολάτα","/so.koˈla.ta/"),"en":("chocolate","/ˈtʃɒk.lət/")}),
    ("lemon", "food_drinks", "beginner",
     "photo-1590502593747-42a996133562", ["photo-1547514701-42782101795e", "photo-1555939594-58d7cb561ad1"],
     {"es":("limón","/liˈmon/"),"pt":("limão","/liˈmɐ̃w̃/"),"fr":("citron","/si.tʁɔ̃/"),"de":("Zitrone","/t͡siˈtʁoː.nə/"),"it":("limone","/liˈmo.ne/"),"el":("λεμόνι","/leˈmo.ni/"),"en":("lemon","/ˈlem.ən/")}),
    ("rice", "food_drinks", "beginner",
     "photo-1587049352846-4a222e784d38", ["photo-1590502593747-42a996133562", "photo-1578985545062-69928b1d9587"],
     {"es":("arroz","/aˈroθ/"),"pt":("arroz","/ɐˈʁoʃ/"),"fr":("riz","/ʁi/"),"de":("Reis","/ʁaɪ̯s/"),"it":("riso","/ˈri.zo/"),"el":("ρύζι","/ˈri.zi/"),"en":("rice","/raɪs/")}),
    # ── OBJECTS batch 2 ──
    ("pencil", "objects", "beginner",
     "photo-1585336261022-680e295ce3fe", ["photo-1544947950-fa07a98d237f", "photo-1521369909029-2afed882baee"],
     {"es":("lápiz","/ˈla.piθ/"),"pt":("lápis","/ˈla.piʃ/"),"fr":("crayon","/kʁɛ.jɔ̃/"),"de":("Bleistift","/ˈblaɪ̯.ʃtɪft/"),"it":("matita","/maˈti.ta/"),"el":("μολύβι","/moˈli.vi/"),"en":("pencil","/ˈpen.sɪl/")}),
    ("mirror", "objects", "intermediate",
     "photo-1555041469-a586c61ea9bc", ["photo-1585336261022-680e295ce3fe", "photo-1524592094714-0f0654e20314"],
     {"es":("espejo","/esˈpe.xo/"),"pt":("espelho","/iʃˈpe.ʎu/"),"fr":("miroir","/mi.ʁwaʁ/"),"de":("Spiegel","/ˈʃpiː.ɡl̩/"),"it":("specchio","/ˈspek.kjo/"),"el":("καθρέφτης","/kaˈθref.tis/"),"en":("mirror","/ˈmɪr.ər/")}),
    ("door", "objects", "beginner",
     "photo-1560343090-f0409e92791a", ["photo-1555041469-a586c61ea9bc", "photo-1585336261022-680e295ce3fe"],
     {"es":("puerta","/ˈpweɾ.ta/"),"pt":("porta","/ˈpoɾ.tɐ/"),"fr":("porte","/pɔʁt/"),"de":("Tür","/tyːɐ̯/"),"it":("porta","/ˈpɔr.ta/"),"el":("πόρτα","/ˈpor.ta/"),"en":("door","/dɔːr/")}),
    ("window", "objects", "beginner",
     "photo-1509644851169-2acc08aa25b5", ["photo-1560343090-f0409e92791a", "photo-1555041469-a586c61ea9bc"],
     {"es":("ventana","/benˈta.na/"),"pt":("janela","/ʒɐˈnɛ.lɐ/"),"fr":("fenêtre","/fə.nɛtʁ/"),"de":("Fenster","/ˈfɛns.tɐ/"),"it":("finestra","/fiˈnɛs.tra/"),"el":("παράθυρο","/paˈra.θi.ro/"),"en":("window","/ˈwɪn.doʊ/")}),
    ("bed", "objects", "beginner",
     "photo-1505693416388-ac5ce068fe85", ["photo-1509644851169-2acc08aa25b5", "photo-1560343090-f0409e92791a"],
     {"es":("cama","/ˈka.ma/"),"pt":("cama","/ˈkɐ.mɐ/"),"fr":("lit","/li/"),"de":("Bett","/bɛt/"),"it":("letto","/ˈlet.to/"),"el":("κρεβάτι","/kreˈva.ti/"),"en":("bed","/bɛd/")}),
    ("bag", "objects", "beginner",
     "photo-1553062407-98eeb64c6a62", ["photo-1505693416388-ac5ce068fe85", "photo-1542291026-7eec264c27ff"],
     {"es":("bolsa","/ˈbol.sa/"),"pt":("bolsa","/ˈbow.sɐ/"),"fr":("sac","/sak/"),"de":("Tasche","/ˈta.ʃə/"),"it":("borsa","/ˈbor.sa/"),"el":("τσάντα","/ˈtsan.da/"),"en":("bag","/bæɡ/")}),
    # ── NATURE batch 2 ──
    ("ocean", "nature", "beginner",
     "photo-1505118380757-91f5f5632de0", ["photo-1519681393784-d120267933ba", "photo-1491002052546-bf38f186af56"],
     {"es":("océano","/oˈθe.a.no/"),"pt":("oceano","/o.siˈɐ.nu/"),"fr":("océan","/ɔ.se.ɑ̃/"),"de":("Ozean","/oˈt͡se.aːn/"),"it":("oceano","/oˈtʃɛ.a.no/"),"el":("ωκεανός","/o.ce.aˈnos/"),"en":("ocean","/ˈoʊ.ʃən/")}),
    ("cave", "nature", "intermediate",
     "photo-1500740516770-92bd004b996e", ["photo-1505118380757-91f5f5632de0", "photo-1562095241-8c6714fd4178"],
     {"es":("cueva","/ˈkwe.βa/"),"pt":("caverna","/kɐˈvɛɾ.nɐ/"),"fr":("grotte","/ɡʁɔt/"),"de":("Höhle","/ˈhøː.lə/"),"it":("grotta","/ˈɡrɔt.ta/"),"el":("σπηλιά","/spiˈlja/"),"en":("cave","/keɪv/")}),
    ("lake", "nature", "beginner",
     "photo-1439066615861-d1af74d74000", ["photo-1500740516770-92bd004b996e", "photo-1505118380757-91f5f5632de0"],
     {"es":("lago","/ˈla.ɣo/"),"pt":("lago","/ˈla.ɡu/"),"fr":("lac","/lak/"),"de":("See","/zeː/"),"it":("lago","/ˈla.ɡo/"),"el":("λίμνη","/ˈlim.ni/"),"en":("lake","/leɪk/")}),
    ("fire", "nature", "beginner",
     "photo-1572726729207-a78d6feb18d7", ["photo-1439066615861-d1af74d74000", "photo-1491002052546-bf38f186af56"],
     {"es":("fuego","/ˈfwe.ɣo/"),"pt":("fogo","/ˈfo.ɡu/"),"fr":("feu","/fø/"),"de":("Feuer","/ˈfɔʏ̯.ɐ/"),"it":("fuoco","/ˈfwɔ.ko/"),"el":("φωτιά","/fo.ˈtja/"),"en":("fire","/faɪər/")}),
    ("rock", "nature", "beginner",
     "photo-1518837695005-2083093ee35b", ["photo-1572726729207-a78d6feb18d7", "photo-1439066615861-d1af74d74000"],
     {"es":("roca","/ˈro.ka/"),"pt":("rocha","/ˈʁo.ʃɐ/"),"fr":("rocher","/ʁɔ.ʃe/"),"de":("Felsen","/ˈfɛl.zn̩/"),"it":("roccia","/ˈrɔt.tʃa/"),"el":("βράχος","/ˈvra.xos/"),"en":("rock","/rɒk/")}),
    ("wind", "nature", "intermediate",
     "photo-1527482797697-8795b05a13fe", ["photo-1518837695005-2083093ee35b", "photo-1572726729207-a78d6feb18d7"],
     {"es":("viento","/ˈbjen.to/"),"pt":("vento","/ˈvẽ.tu/"),"fr":("vent","/vɑ̃/"),"de":("Wind","/vɪnt/"),"it":("vento","/ˈvɛn.to/"),"el":("άνεμος","/ˈa.ne.mos/"),"en":("wind","/wɪnd/")}),
    # ── COLORS ──
    ("blue", "colors", "beginner",
     "photo-1536514498073-50e69d39c6cf", ["photo-1504608524841-42fe6f032b4b", "photo-1572726729207-a78d6feb18d7"],
     {"es":("azul","/aˈθul/"),"pt":("azul","/ɐˈzuw/"),"fr":("bleu","/blø/"),"de":("blau","/blaʊ̯/"),"it":("blu","/blu/"),"el":("μπλε","/ble/"),"en":("blue","/bluː/")}),
    ("green", "colors", "beginner",
     "photo-1470071459604-3b5ec3a7fe05", ["photo-1536514498073-50e69d39c6cf", "photo-1572726729207-a78d6feb18d7"],
     {"es":("verde","/ˈbeɾ.ðe/"),"pt":("verde","/ˈveɾ.dʒi/"),"fr":("vert","/vɛʁ/"),"de":("grün","/ɡʁyːn/"),"it":("verde","/ˈver.de/"),"el":("πράσινο","/ˈpra.si.no/"),"en":("green","/ɡriːn/")}),
    ("yellow", "colors", "beginner",
     "photo-1504608524841-42fe6f032b4b", ["photo-1470071459604-3b5ec3a7fe05", "photo-1536514498073-50e69d39c6cf"],
     {"es":("amarillo","/a.maˈɾi.ʎo/"),"pt":("amarelo","/ɐ.mɐˈɾe.lu/"),"fr":("jaune","/ʒon/"),"de":("gelb","/ɡɛlp/"),"it":("giallo","/ˈdʒal.lo/"),"el":("κίτρινο","/ˈci.tri.no/"),"en":("yellow","/ˈjel.oʊ/")}),
    ("white", "colors", "beginner",
     "photo-1501691223387-dd0500403074", ["photo-1504608524841-42fe6f032b4b", "photo-1470071459604-3b5ec3a7fe05"],
     {"es":("blanco","/ˈblaŋ.ko/"),"pt":("branco","/ˈbɾɐ̃.ku/"),"fr":("blanc","/blɑ̃/"),"de":("weiß","/vaɪ̯s/"),"it":("bianco","/ˈbjaŋ.ko/"),"el":("λευκό","/lefˈko/"),"en":("white","/waɪt/")}),
    ("black", "colors", "beginner",
     "photo-1534274988757-a28bf1a57c17", ["photo-1501691223387-dd0500403074", "photo-1536514498073-50e69d39c6cf"],
     {"es":("negro","/ˈne.ɣɾo/"),"pt":("preto","/ˈpɾe.tu/"),"fr":("noir","/nwaʁ/"),"de":("schwarz","/ʃvaʁt͡s/"),"it":("nero","/ˈne.ro/"),"el":("μαύρο","/ˈmav.ro/"),"en":("black","/blæk/")}),
]

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

# Verify images
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
    print(f"\n{len(broken)} broken URLs! Fix before seeding.")
else:
    print(f"All {len(all_ids)} URLs verified OK!")
    seed_table("memory-game-language-words-dev")
    seed_table("memory-game-language-words-prod")
    print("\nDone!")
