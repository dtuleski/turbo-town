#!/bin/bash
# =============================================================================
# Language Learning Game — Word Expansion Seed Script (Batch 2)
# =============================================================================
# Adds ~180 NEW words to the existing DynamoDB table.
# Uses "_seed2" suffix to avoid conflicts with existing "_seed" entries.
#
# Categories: animals, food, colors, numbers, objects, nature
# Difficulties: beginner, intermediate, advanced
# Languages: en, es, fr, de, it, pt, el (7 total)
#
# Usage:
#   bash scripts/seed-language-expansion.sh                  # dev (default profile)
#   bash scripts/seed-language-expansion.sh dashden-new      # prod (--profile dashden-new)
# =============================================================================

set -euo pipefail

TABLE_NAME="${LANGUAGE_WORDS_TABLE_NAME:-memory-game-language-words-dev}"
REGION="us-east-1"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
COUNT=0
ERRORS=0

# Optional AWS profile (first argument)
PROFILE_ARG=""
if [ -n "${1:-}" ]; then
  PROFILE_ARG="--profile $1"
  echo "🔑 Using AWS profile: $1"
fi

echo "🌍 Seeding language expansion (batch 2) into $TABLE_NAME..."
echo "   Region: $REGION"
echo "   Timestamp: $NOW"
echo ""

# ---------------------------------------------------------------------------
# put_word — insert one word into DynamoDB
# Args: WORD_ID CATEGORY DIFFICULTY IMAGE_URL D1 D2
#        EN_W EN_P  ES_W ES_P  FR_W FR_P  DE_W DE_P  IT_W IT_P  PT_W PT_P  EL_W EL_P
# ---------------------------------------------------------------------------
put_word() {
  local WORD_ID="$1"
  local CATEGORY="$2"
  local DIFFICULTY="$3"
  local IMAGE_URL="$4"
  local D1="$5"
  local D2="$6"
  local EN_W="$7"   EN_P="$8"
  local ES_W="$9"   ES_P="${10}"
  local FR_W="${11}" FR_P="${12}"
  local DE_W="${13}" DE_P="${14}"
  local IT_W="${15}" IT_P="${16}"
  local PT_W="${17}" PT_P="${18}"
  local EL_W="${19}" EL_P="${20}"

  if aws dynamodb put-item $PROFILE_ARG --table-name "$TABLE_NAME" --region "$REGION" --item "{
    \"wordId\": {\"S\": \"${CATEGORY}_${WORD_ID}_seed2\"},
    \"category\": {\"S\": \"$CATEGORY\"},
    \"difficulty\": {\"S\": \"$DIFFICULTY\"},
    \"languageCode\": {\"S\": \"multi\"},
    \"imageUrl\": {\"S\": \"$IMAGE_URL\"},
    \"distractorImages\": {\"L\": [{\"S\": \"$D1\"}, {\"S\": \"$D2\"}]},
    \"translations\": {\"M\": {
      \"en\": {\"M\": {\"word\": {\"S\": \"$EN_W\"}, \"pronunciation\": {\"S\": \"$EN_P\"}}},
      \"es\": {\"M\": {\"word\": {\"S\": \"$ES_W\"}, \"pronunciation\": {\"S\": \"$ES_P\"}}},
      \"fr\": {\"M\": {\"word\": {\"S\": \"$FR_W\"}, \"pronunciation\": {\"S\": \"$FR_P\"}}},
      \"de\": {\"M\": {\"word\": {\"S\": \"$DE_W\"}, \"pronunciation\": {\"S\": \"$DE_P\"}}},
      \"it\": {\"M\": {\"word\": {\"S\": \"$IT_W\"}, \"pronunciation\": {\"S\": \"$IT_P\"}}},
      \"pt\": {\"M\": {\"word\": {\"S\": \"$PT_W\"}, \"pronunciation\": {\"S\": \"$PT_P\"}}},
      \"el\": {\"M\": {\"word\": {\"S\": \"$EL_W\"}, \"pronunciation\": {\"S\": \"$EL_P\"}}}
    }},
    \"createdAt\": {\"S\": \"$NOW\"},
    \"updatedAt\": {\"S\": \"$NOW\"}
  }" 2>/dev/null; then
    COUNT=$((COUNT + 1))
    echo "  ✅ [$COUNT] $EN_W ($CATEGORY/$DIFFICULTY)"
  else
    ERRORS=$((ERRORS + 1))
    echo "  ❌ FAILED: $EN_W ($CATEGORY/$DIFFICULTY)"
  fi
}

# Unsplash base URL shorthand
U="https://images.unsplash.com"


# =============================================================================
# 🐻 ANIMALS — Beginner (8 words)
# =============================================================================
echo ""
echo "=== 🐻 ANIMALS — Beginner ==="

put_word "bear" "animals" "beginner" \
  "$U/photo-1589656966895-2f33e7653819?w=300&h=300&fit=crop" \
  "$U/photo-1504173010664-32509aeebb62?w=300&h=300&fit=crop" \
  "$U/photo-1474511320723-9a56873571b7?w=300&h=300&fit=crop" \
  "bear" "/bɛr/" \
  "oso" "/ˈo.so/" \
  "ours" "/uʁs/" \
  "Bär" "/bɛːɐ̯/" \
  "orso" "/ˈor.so/" \
  "urso" "/ˈuɾ.su/" \
  "αρκούδα" "/ar.ˈku.ða/"

put_word "wolf" "animals" "beginner" \
  "$U/photo-1504173010664-32509aeebb62?w=300&h=300&fit=crop" \
  "$U/photo-1589656966895-2f33e7653819?w=300&h=300&fit=crop" \
  "$U/photo-1535338454528-1b22dc446882?w=300&h=300&fit=crop" \
  "wolf" "/wʊlf/" \
  "lobo" "/ˈlo.βo/" \
  "loup" "/lu/" \
  "Wolf" "/vɔlf/" \
  "lupo" "/ˈlu.po/" \
  "lobo" "/ˈlo.bu/" \
  "λύκος" "/ˈli.kos/"

put_word "fox" "animals" "beginner" \
  "$U/photo-1535338454528-1b22dc446882?w=300&h=300&fit=crop" \
  "$U/photo-1504173010664-32509aeebb62?w=300&h=300&fit=crop" \
  "$U/photo-1589656966895-2f33e7653819?w=300&h=300&fit=crop" \
  "fox" "/fɒks/" \
  "zorro" "/ˈθo.ro/" \
  "renard" "/ʁə.naʁ/" \
  "Fuchs" "/fʊks/" \
  "volpe" "/ˈvol.pe/" \
  "raposa" "/ʁa.ˈpo.zɐ/" \
  "αλεπού" "/a.le.ˈpu/"

put_word "deer" "animals" "beginner" \
  "$U/photo-1484406566174-9da000fda645?w=300&h=300&fit=crop" \
  "$U/photo-1535338454528-1b22dc446882?w=300&h=300&fit=crop" \
  "$U/photo-1589656966895-2f33e7653819?w=300&h=300&fit=crop" \
  "deer" "/dɪr/" \
  "ciervo" "/ˈθjeɾ.βo/" \
  "cerf" "/sɛʁ/" \
  "Hirsch" "/hɪʁʃ/" \
  "cervo" "/ˈtʃer.vo/" \
  "cervo" "/ˈseɾ.vu/" \
  "ελάφι" "/e.ˈla.fi/"

put_word "pig" "animals" "beginner" \
  "$U/photo-1516467508483-a7212febe31a?w=300&h=300&fit=crop" \
  "$U/photo-1484406566174-9da000fda645?w=300&h=300&fit=crop" \
  "$U/photo-1535338454528-1b22dc446882?w=300&h=300&fit=crop" \
  "pig" "/pɪɡ/" \
  "cerdo" "/ˈθeɾ.ðo/" \
  "cochon" "/kɔ.ʃɔ̃/" \
  "Schwein" "/ʃvaɪ̯n/" \
  "maiale" "/ma.ˈja.le/" \
  "porco" "/ˈpoɾ.ku/" \
  "γουρούνι" "/ɣu.ˈru.ni/"

put_word "sheep" "animals" "beginner" \
  "$U/photo-1484557985045-edf25e08da73?w=300&h=300&fit=crop" \
  "$U/photo-1516467508483-a7212febe31a?w=300&h=300&fit=crop" \
  "$U/photo-1484406566174-9da000fda645?w=300&h=300&fit=crop" \
  "sheep" "/ʃiːp/" \
  "oveja" "/o.ˈβe.xa/" \
  "mouton" "/mu.tɔ̃/" \
  "Schaf" "/ʃaːf/" \
  "pecora" "/ˈpe.ko.ra/" \
  "ovelha" "/o.ˈve.ʎɐ/" \
  "πρόβατο" "/ˈpro.va.to/"

put_word "goat" "animals" "beginner" \
  "$U/photo-1524024973431-2ad916746264?w=300&h=300&fit=crop" \
  "$U/photo-1484557985045-edf25e08da73?w=300&h=300&fit=crop" \
  "$U/photo-1516467508483-a7212febe31a?w=300&h=300&fit=crop" \
  "goat" "/ɡoʊt/" \
  "cabra" "/ˈka.βɾa/" \
  "chèvre" "/ʃɛvʁ/" \
  "Ziege" "/ˈtsiː.ɡə/" \
  "capra" "/ˈka.pra/" \
  "cabra" "/ˈka.bɾɐ/" \
  "κατσίκα" "/ka.ˈtsi.ka/"

put_word "frog" "animals" "beginner" \
  "$U/photo-1474314005122-3c07c4df1224?w=300&h=300&fit=crop" \
  "$U/photo-1524024973431-2ad916746264?w=300&h=300&fit=crop" \
  "$U/photo-1484557985045-edf25e08da73?w=300&h=300&fit=crop" \
  "frog" "/frɒɡ/" \
  "rana" "/ˈra.na/" \
  "grenouille" "/ɡʁə.nuj/" \
  "Frosch" "/fʁɔʃ/" \
  "rana" "/ˈra.na/" \
  "rã" "/ˈʁɐ̃/" \
  "βάτραχος" "/ˈva.tra.xos/"


# =============================================================================
# 🐻 ANIMALS — Intermediate (8 words)
# =============================================================================
echo ""
echo "=== 🐻 ANIMALS — Intermediate ==="

put_word "monkey" "animals" "intermediate" \
  "$U/photo-1540573133985-87b6da6d54a9?w=300&h=300&fit=crop" \
  "$U/photo-1437622368342-7a3d73a34c8f?w=300&h=300&fit=crop" \
  "$U/photo-1474314005122-3c07c4df1224?w=300&h=300&fit=crop" \
  "monkey" "/ˈmʌŋ.ki/" \
  "mono" "/ˈmo.no/" \
  "singe" "/sɛ̃ʒ/" \
  "Affe" "/ˈa.fə/" \
  "scimmia" "/ˈʃim.mja/" \
  "macaco" "/ma.ˈka.ku/" \
  "μαϊμού" "/ma.i.ˈmu/"

put_word "parrot" "animals" "intermediate" \
  "$U/photo-1544923408-75c5cef46f14?w=300&h=300&fit=crop" \
  "$U/photo-1540573133985-87b6da6d54a9?w=300&h=300&fit=crop" \
  "$U/photo-1437622368342-7a3d73a34c8f?w=300&h=300&fit=crop" \
  "parrot" "/ˈpær.ət/" \
  "loro" "/ˈlo.ɾo/" \
  "perroquet" "/pɛ.ʁɔ.kɛ/" \
  "Papagei" "/pa.pa.ˈɡaɪ̯/" \
  "pappagallo" "/pap.pa.ˈɡal.lo/" \
  "papagaio" "/pa.pa.ˈɡaj.u/" \
  "παπαγάλος" "/pa.pa.ˈɣa.los/"

put_word "eagle" "animals" "intermediate" \
  "$U/photo-1611689342806-0863700ce8e4?w=300&h=300&fit=crop" \
  "$U/photo-1544923408-75c5cef46f14?w=300&h=300&fit=crop" \
  "$U/photo-1540573133985-87b6da6d54a9?w=300&h=300&fit=crop" \
  "eagle" "/ˈiː.ɡəl/" \
  "águila" "/ˈa.ɣi.la/" \
  "aigle" "/ɛɡl/" \
  "Adler" "/ˈaːd.lɐ/" \
  "aquila" "/ˈa.kwi.la/" \
  "águia" "/ˈa.ɡjɐ/" \
  "αετός" "/a.e.ˈtos/"

put_word "whale" "animals" "intermediate" \
  "$U/photo-1568430462989-44163eb1752f?w=300&h=300&fit=crop" \
  "$U/photo-1437622368342-7a3d73a34c8f?w=300&h=300&fit=crop" \
  "$U/photo-1611689342806-0863700ce8e4?w=300&h=300&fit=crop" \
  "whale" "/weɪl/" \
  "ballena" "/ba.ˈʎe.na/" \
  "baleine" "/ba.lɛn/" \
  "Wal" "/vaːl/" \
  "balena" "/ba.ˈle.na/" \
  "baleia" "/ba.ˈlej.ɐ/" \
  "φάλαινα" "/ˈfa.le.na/"

put_word "shark" "animals" "intermediate" \
  "$U/photo-1560275619-4662e36fa65c?w=300&h=300&fit=crop" \
  "$U/photo-1568430462989-44163eb1752f?w=300&h=300&fit=crop" \
  "$U/photo-1544923408-75c5cef46f14?w=300&h=300&fit=crop" \
  "shark" "/ʃɑːrk/" \
  "tiburón" "/ti.βu.ˈɾon/" \
  "requin" "/ʁə.kɛ̃/" \
  "Hai" "/haɪ̯/" \
  "squalo" "/ˈskwa.lo/" \
  "tubarão" "/tu.ba.ˈɾɐ̃w̃/" \
  "καρχαρίας" "/kar.xa.ˈri.as/"

put_word "snake" "animals" "intermediate" \
  "$U/photo-1531386151447-fd76ad50012f?w=300&h=300&fit=crop" \
  "$U/photo-1560275619-4662e36fa65c?w=300&h=300&fit=crop" \
  "$U/photo-1474314005122-3c07c4df1224?w=300&h=300&fit=crop" \
  "snake" "/sneɪk/" \
  "serpiente" "/seɾ.ˈpjen.te/" \
  "serpent" "/sɛʁ.pɑ̃/" \
  "Schlange" "/ˈʃlaŋ.ə/" \
  "serpente" "/ser.ˈpen.te/" \
  "cobra" "/ˈko.bɾɐ/" \
  "φίδι" "/ˈfi.ði/"

put_word "spider" "animals" "intermediate" \
  "$U/photo-1568492031960-e0ec5be43a68?w=300&h=300&fit=crop" \
  "$U/photo-1531386151447-fd76ad50012f?w=300&h=300&fit=crop" \
  "$U/photo-1560275619-4662e36fa65c?w=300&h=300&fit=crop" \
  "spider" "/ˈspaɪ.dər/" \
  "araña" "/a.ˈɾa.ɲa/" \
  "araignée" "/a.ʁɛ.ɲe/" \
  "Spinne" "/ˈʃpɪ.nə/" \
  "ragno" "/ˈraɲ.ɲo/" \
  "aranha" "/a.ˈɾɐ.ɲɐ/" \
  "αράχνη" "/a.ˈrax.ni/"

put_word "seal" "animals" "intermediate" \
  "$U/photo-1505322022379-7c3353ee6291?w=300&h=300&fit=crop" \
  "$U/photo-1568430462989-44163eb1752f?w=300&h=300&fit=crop" \
  "$U/photo-1560275619-4662e36fa65c?w=300&h=300&fit=crop" \
  "seal" "/siːl/" \
  "foca" "/ˈfo.ka/" \
  "phoque" "/fɔk/" \
  "Robbe" "/ˈʁɔ.bə/" \
  "foca" "/ˈfɔ.ka/" \
  "foca" "/ˈfɔ.kɐ/" \
  "φώκια" "/ˈfo.kja/"


# =============================================================================
# 🐻 ANIMALS — Advanced (8 words)
# =============================================================================
echo ""
echo "=== 🐻 ANIMALS — Advanced ==="

put_word "butterfly" "animals" "advanced" \
  "$U/photo-1452570053594-1b985d6ea890?w=300&h=300&fit=crop" \
  "$U/photo-1437622368342-7a3d73a34c8f?w=300&h=300&fit=crop" \
  "$U/photo-1505322022379-7c3353ee6291?w=300&h=300&fit=crop" \
  "butterfly" "/ˈbʌt.ər.flaɪ/" \
  "mariposa" "/ma.ɾi.ˈpo.sa/" \
  "papillon" "/pa.pi.jɔ̃/" \
  "Schmetterling" "/ˈʃmɛ.tɐ.lɪŋ/" \
  "farfalla" "/far.ˈfal.la/" \
  "borboleta" "/boɾ.bo.ˈle.tɐ/" \
  "πεταλούδα" "/pe.ta.ˈlu.ða/"

put_word "koala" "animals" "advanced" \
  "$U/photo-1459262838948-3e2de6c1ec80?w=300&h=300&fit=crop" \
  "$U/photo-1452570053594-1b985d6ea890?w=300&h=300&fit=crop" \
  "$U/photo-1540573133985-87b6da6d54a9?w=300&h=300&fit=crop" \
  "koala" "/koʊ.ˈɑː.lə/" \
  "koala" "/ko.ˈa.la/" \
  "koala" "/kɔ.a.la/" \
  "Koala" "/ko.ˈaː.la/" \
  "koala" "/ko.ˈa.la/" \
  "coala" "/ko.ˈa.lɐ/" \
  "κοάλα" "/ko.ˈa.la/"

put_word "panda" "animals" "advanced" \
  "$U/photo-1564349683136-77e08dba1ef7?w=300&h=300&fit=crop" \
  "$U/photo-1459262838948-3e2de6c1ec80?w=300&h=300&fit=crop" \
  "$U/photo-1452570053594-1b985d6ea890?w=300&h=300&fit=crop" \
  "panda" "/ˈpæn.də/" \
  "panda" "/ˈpan.da/" \
  "panda" "/pɑ̃.da/" \
  "Panda" "/ˈpan.da/" \
  "panda" "/ˈpan.da/" \
  "panda" "/ˈpɐ̃.dɐ/" \
  "πάντα" "/ˈpan.da/"

put_word "squirrel" "animals" "advanced" \
  "$U/photo-1507666405895-422eee7d517f?w=300&h=300&fit=crop" \
  "$U/photo-1564349683136-77e08dba1ef7?w=300&h=300&fit=crop" \
  "$U/photo-1459262838948-3e2de6c1ec80?w=300&h=300&fit=crop" \
  "squirrel" "/ˈskwɪr.əl/" \
  "ardilla" "/aɾ.ˈði.ʎa/" \
  "écureuil" "/e.ky.ʁœj/" \
  "Eichhörnchen" "/ˈaɪ̯ç.hœʁn.çən/" \
  "scoiattolo" "/sko.ˈjat.to.lo/" \
  "esquilo" "/iʃ.ˈki.lu/" \
  "σκίουρος" "/ˈski.u.ros/"

put_word "crocodile" "animals" "advanced" \
  "$U/photo-1585095595205-e68428a9e205?w=300&h=300&fit=crop" \
  "$U/photo-1507666405895-422eee7d517f?w=300&h=300&fit=crop" \
  "$U/photo-1531386151447-fd76ad50012f?w=300&h=300&fit=crop" \
  "crocodile" "/ˈkrɒk.ə.daɪl/" \
  "cocodrilo" "/ko.ko.ˈðɾi.lo/" \
  "crocodile" "/kʁɔ.kɔ.dil/" \
  "Krokodil" "/kʁo.ko.ˈdiːl/" \
  "coccodrillo" "/kok.ko.ˈdril.lo/" \
  "crocodilo" "/kɾo.ko.ˈdi.lu/" \
  "κροκόδειλος" "/kro.ˈko.ði.los/"

put_word "bat" "animals" "advanced" \
  "$U/photo-1593085260707-5377ba37f868?w=300&h=300&fit=crop" \
  "$U/photo-1585095595205-e68428a9e205?w=300&h=300&fit=crop" \
  "$U/photo-1452570053594-1b985d6ea890?w=300&h=300&fit=crop" \
  "bat" "/bæt/" \
  "murciélago" "/muɾ.ˈθje.la.ɣo/" \
  "chauve-souris" "/ʃov.su.ʁi/" \
  "Fledermaus" "/ˈfleː.dɐ.maʊ̯s/" \
  "pipistrello" "/pi.pi.ˈstrel.lo/" \
  "morcego" "/moɾ.ˈse.ɡu/" \
  "νυχτερίδα" "/nix.te.ˈri.ða/"

put_word "bee" "animals" "advanced" \
  "$U/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop" \
  "$U/photo-1593085260707-5377ba37f868?w=300&h=300&fit=crop" \
  "$U/photo-1452570053594-1b985d6ea890?w=300&h=300&fit=crop" \
  "bee" "/biː/" \
  "abeja" "/a.ˈβe.xa/" \
  "abeille" "/a.bɛj/" \
  "Biene" "/ˈbiː.nə/" \
  "ape" "/ˈa.pe/" \
  "abelha" "/a.ˈbe.ʎɐ/" \
  "μέλισσα" "/ˈme.li.sa/"

put_word "ant" "animals" "advanced" \
  "$U/photo-1563387852-e109c8e0d6b9?w=300&h=300&fit=crop" \
  "$U/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop" \
  "$U/photo-1593085260707-5377ba37f868?w=300&h=300&fit=crop" \
  "ant" "/ænt/" \
  "hormiga" "/oɾ.ˈmi.ɣa/" \
  "fourmi" "/fuʁ.mi/" \
  "Ameise" "/a.ˈmaɪ̯.zə/" \
  "formica" "/for.ˈmi.ka/" \
  "formiga" "/foɾ.ˈmi.ɡɐ/" \
  "μυρμήγκι" "/mir.ˈmiŋ.ɡi/"


# =============================================================================
# 🍇 FOOD — Beginner (8 words)
# =============================================================================
echo ""
echo "=== 🍇 FOOD — Beginner ==="

put_word "grape" "food" "beginner" \
  "$U/photo-1537640538966-79f369143f8f?w=300&h=300&fit=crop" \
  "$U/photo-1587486913049-53fc88980cfc?w=300&h=300&fit=crop" \
  "$U/photo-1518977676601-b28d4e90e5a4?w=300&h=300&fit=crop" \
  "grape" "/ɡreɪp/" \
  "uva" "/ˈu.βa/" \
  "raisin" "/ʁɛ.zɛ̃/" \
  "Traube" "/ˈtʁaʊ̯.bə/" \
  "uva" "/ˈu.va/" \
  "uva" "/ˈu.vɐ/" \
  "σταφύλι" "/sta.ˈfi.li/"

put_word "lemon" "food" "beginner" \
  "$U/photo-1587486913049-53fc88980cfc?w=300&h=300&fit=crop" \
  "$U/photo-1537640538966-79f369143f8f?w=300&h=300&fit=crop" \
  "$U/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop" \
  "lemon" "/ˈlem.ən/" \
  "limón" "/li.ˈmon/" \
  "citron" "/si.tʁɔ̃/" \
  "Zitrone" "/tsi.ˈtʁoː.nə/" \
  "limone" "/li.ˈmo.ne/" \
  "limão" "/li.ˈmɐ̃w̃/" \
  "λεμόνι" "/le.ˈmo.ni/"

put_word "potato" "food" "beginner" \
  "$U/photo-1518977676601-b28d4e90e5a4?w=300&h=300&fit=crop" \
  "$U/photo-1587486913049-53fc88980cfc?w=300&h=300&fit=crop" \
  "$U/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop" \
  "potato" "/pə.ˈteɪ.toʊ/" \
  "patata" "/pa.ˈta.ta/" \
  "pomme de terre" "/pɔm.də.tɛʁ/" \
  "Kartoffel" "/kaʁ.ˈtɔ.fəl/" \
  "patata" "/pa.ˈta.ta/" \
  "batata" "/ba.ˈta.tɐ/" \
  "πατάτα" "/pa.ˈta.ta/"

put_word "onion" "food" "beginner" \
  "$U/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop" \
  "$U/photo-1518977676601-b28d4e90e5a4?w=300&h=300&fit=crop" \
  "$U/photo-1537640538966-79f369143f8f?w=300&h=300&fit=crop" \
  "onion" "/ˈʌn.jən/" \
  "cebolla" "/θe.ˈβo.ʎa/" \
  "oignon" "/ɔ.ɲɔ̃/" \
  "Zwiebel" "/ˈtsviː.bəl/" \
  "cipolla" "/tʃi.ˈpol.la/" \
  "cebola" "/se.ˈbo.lɐ/" \
  "κρεμμύδι" "/kre.ˈmi.ði/"

put_word "corn" "food" "beginner" \
  "$U/photo-1551754655-cd27e38d2076?w=300&h=300&fit=crop" \
  "$U/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop" \
  "$U/photo-1518977676601-b28d4e90e5a4?w=300&h=300&fit=crop" \
  "corn" "/kɔːrn/" \
  "maíz" "/ma.ˈiθ/" \
  "maïs" "/ma.is/" \
  "Mais" "/maɪ̯s/" \
  "mais" "/ˈma.is/" \
  "milho" "/ˈmi.ʎu/" \
  "καλαμπόκι" "/ka.lam.ˈbo.ki/"

put_word "pepper" "food" "beginner" \
  "$U/photo-1563565375-04db58801981?w=300&h=300&fit=crop" \
  "$U/photo-1551754655-cd27e38d2076?w=300&h=300&fit=crop" \
  "$U/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop" \
  "pepper" "/ˈpep.ər/" \
  "pimiento" "/pi.ˈmjen.to/" \
  "poivron" "/pwa.vʁɔ̃/" \
  "Paprika" "/ˈpa.pʁi.ka/" \
  "peperone" "/pe.pe.ˈro.ne/" \
  "pimentão" "/pi.mẽ.ˈtɐ̃w̃/" \
  "πιπεριά" "/pi.pe.ˈrja/"

put_word "cherry" "food" "beginner" \
  "$U/photo-1528821128474-27f963b062bf?w=300&h=300&fit=crop" \
  "$U/photo-1537640538966-79f369143f8f?w=300&h=300&fit=crop" \
  "$U/photo-1563565375-04db58801981?w=300&h=300&fit=crop" \
  "cherry" "/ˈtʃer.i/" \
  "cereza" "/θe.ˈɾe.θa/" \
  "cerise" "/sə.ʁiz/" \
  "Kirsche" "/ˈkɪʁ.ʃə/" \
  "ciliegia" "/tʃi.ˈlje.dʒa/" \
  "cereja" "/se.ˈɾe.ʒɐ/" \
  "κεράσι" "/ke.ˈra.si/"

put_word "peach" "food" "beginner" \
  "$U/photo-1595124216650-1dead4736357?w=300&h=300&fit=crop" \
  "$U/photo-1528821128474-27f963b062bf?w=300&h=300&fit=crop" \
  "$U/photo-1537640538966-79f369143f8f?w=300&h=300&fit=crop" \
  "peach" "/piːtʃ/" \
  "melocotón" "/me.lo.ko.ˈton/" \
  "pêche" "/pɛʃ/" \
  "Pfirsich" "/ˈpfɪʁ.zɪç/" \
  "pesca" "/ˈpes.ka/" \
  "pêssego" "/ˈpe.se.ɡu/" \
  "ροδάκινο" "/ro.ˈða.ki.no/"


# =============================================================================
# 🍇 FOOD — Intermediate (8 words)
# =============================================================================
echo ""
echo "=== 🍇 FOOD — Intermediate ==="

put_word "mango" "food" "intermediate" \
  "$U/photo-1553279768-865429fa0078?w=300&h=300&fit=crop" \
  "$U/photo-1595124216650-1dead4736357?w=300&h=300&fit=crop" \
  "$U/photo-1528821128474-27f963b062bf?w=300&h=300&fit=crop" \
  "mango" "/ˈmæŋ.ɡoʊ/" \
  "mango" "/ˈmaŋ.ɡo/" \
  "mangue" "/mɑ̃ɡ/" \
  "Mango" "/ˈmaŋ.ɡo/" \
  "mango" "/ˈman.ɡo/" \
  "manga" "/ˈmɐ̃.ɡɐ/" \
  "μάνγκο" "/ˈmaŋ.ɡo/"

put_word "coconut" "food" "intermediate" \
  "$U/photo-1550828520-4cb496926fc9?w=300&h=300&fit=crop" \
  "$U/photo-1553279768-865429fa0078?w=300&h=300&fit=crop" \
  "$U/photo-1595124216650-1dead4736357?w=300&h=300&fit=crop" \
  "coconut" "/ˈkoʊ.kə.nʌt/" \
  "coco" "/ˈko.ko/" \
  "noix de coco" "/nwa.də.ko.ko/" \
  "Kokosnuss" "/ˈko.kos.nʊs/" \
  "cocco" "/ˈkɔk.ko/" \
  "coco" "/ˈko.ku/" \
  "καρύδα" "/ka.ˈri.ða/"

put_word "garlic" "food" "intermediate" \
  "$U/photo-1540148426945-6cf22a6b2851?w=300&h=300&fit=crop" \
  "$U/photo-1550828520-4cb496926fc9?w=300&h=300&fit=crop" \
  "$U/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop" \
  "garlic" "/ˈɡɑːr.lɪk/" \
  "ajo" "/ˈa.xo/" \
  "ail" "/aj/" \
  "Knoblauch" "/ˈknoːp.laʊ̯x/" \
  "aglio" "/ˈaʎ.ʎo/" \
  "alho" "/ˈa.ʎu/" \
  "σκόρδο" "/ˈskor.ðo/"

put_word "lettuce" "food" "intermediate" \
  "$U/photo-1622206151226-18ca2c9ab4a1?w=300&h=300&fit=crop" \
  "$U/photo-1540148426945-6cf22a6b2851?w=300&h=300&fit=crop" \
  "$U/photo-1563565375-04db58801981?w=300&h=300&fit=crop" \
  "lettuce" "/ˈlet.ɪs/" \
  "lechuga" "/le.ˈtʃu.ɣa/" \
  "laitue" "/lɛ.ty/" \
  "Salat" "/za.ˈlaːt/" \
  "lattuga" "/lat.ˈtu.ɡa/" \
  "alface" "/aɫ.ˈfa.sɨ/" \
  "μαρούλι" "/ma.ˈru.li/"

put_word "cucumber" "food" "intermediate" \
  "$U/photo-1604977042946-1eecc30f269e?w=300&h=300&fit=crop" \
  "$U/photo-1622206151226-18ca2c9ab4a1?w=300&h=300&fit=crop" \
  "$U/photo-1540148426945-6cf22a6b2851?w=300&h=300&fit=crop" \
  "cucumber" "/ˈkjuː.kʌm.bər/" \
  "pepino" "/pe.ˈpi.no/" \
  "concombre" "/kɔ̃.kɔ̃bʁ/" \
  "Gurke" "/ˈɡʊʁ.kə/" \
  "cetriolo" "/tʃe.ˈtrjɔ.lo/" \
  "pepino" "/pe.ˈpi.nu/" \
  "αγγούρι" "/aŋ.ˈɡu.ri/"

put_word "pizza" "food" "intermediate" \
  "$U/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop" \
  "$U/photo-1604977042946-1eecc30f269e?w=300&h=300&fit=crop" \
  "$U/photo-1622206151226-18ca2c9ab4a1?w=300&h=300&fit=crop" \
  "pizza" "/ˈpiːt.sə/" \
  "pizza" "/ˈpi.θa/" \
  "pizza" "/pi.dza/" \
  "Pizza" "/ˈpɪ.tsa/" \
  "pizza" "/ˈpit.tsa/" \
  "pizza" "/ˈpi.zɐ/" \
  "πίτσα" "/ˈpi.tsa/"

put_word "pasta" "food" "intermediate" \
  "$U/photo-1551183053-bf91a1d81141?w=300&h=300&fit=crop" \
  "$U/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop" \
  "$U/photo-1604977042946-1eecc30f269e?w=300&h=300&fit=crop" \
  "pasta" "/ˈpæs.tə/" \
  "pasta" "/ˈpas.ta/" \
  "pâtes" "/pɑt/" \
  "Nudeln" "/ˈnuː.dəln/" \
  "pasta" "/ˈpas.ta/" \
  "massa" "/ˈma.sɐ/" \
  "ζυμαρικά" "/zi.ma.ri.ˈka/"

put_word "soup" "food" "intermediate" \
  "$U/photo-1547592166-23ac45744acd?w=300&h=300&fit=crop" \
  "$U/photo-1551183053-bf91a1d81141?w=300&h=300&fit=crop" \
  "$U/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop" \
  "soup" "/suːp/" \
  "sopa" "/ˈso.pa/" \
  "soupe" "/sup/" \
  "Suppe" "/ˈzʊ.pə/" \
  "zuppa" "/ˈdzup.pa/" \
  "sopa" "/ˈso.pɐ/" \
  "σούπα" "/ˈsu.pa/"


# =============================================================================
# 🍇 FOOD — Advanced (8 words)
# =============================================================================
echo ""
echo "=== 🍇 FOOD — Advanced ==="

put_word "broccoli" "food" "advanced" \
  "$U/photo-1459411552884-841db9b3cc2a?w=300&h=300&fit=crop" \
  "$U/photo-1547592166-23ac45744acd?w=300&h=300&fit=crop" \
  "$U/photo-1551183053-bf91a1d81141?w=300&h=300&fit=crop" \
  "broccoli" "/ˈbrɒk.əl.i/" \
  "brócoli" "/ˈbɾo.ko.li/" \
  "brocoli" "/bʁɔ.kɔ.li/" \
  "Brokkoli" "/ˈbʁɔ.ko.li/" \
  "broccoli" "/ˈbrɔk.ko.li/" \
  "brócolis" "/ˈbɾɔ.ko.lis/" \
  "μπρόκολο" "/ˈbro.ko.lo/"

put_word "avocado" "food" "advanced" \
  "$U/photo-1523049673857-eb18f1d7b578?w=300&h=300&fit=crop" \
  "$U/photo-1459411552884-841db9b3cc2a?w=300&h=300&fit=crop" \
  "$U/photo-1553279768-865429fa0078?w=300&h=300&fit=crop" \
  "avocado" "/ˌæv.ə.ˈkɑː.doʊ/" \
  "aguacate" "/a.ɣwa.ˈka.te/" \
  "avocat" "/a.vɔ.ka/" \
  "Avocado" "/a.vo.ˈkaː.do/" \
  "avocado" "/a.vo.ˈka.do/" \
  "abacate" "/a.ba.ˈka.tɨ/" \
  "αβοκάντο" "/a.vo.ˈkan.do/"

put_word "chocolate" "food" "advanced" \
  "$U/photo-1481391319762-47dff72954d9?w=300&h=300&fit=crop" \
  "$U/photo-1523049673857-eb18f1d7b578?w=300&h=300&fit=crop" \
  "$U/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop" \
  "chocolate" "/ˈtʃɒk.lət/" \
  "chocolate" "/tʃo.ko.ˈla.te/" \
  "chocolat" "/ʃɔ.kɔ.la/" \
  "Schokolade" "/ʃo.ko.ˈlaː.də/" \
  "cioccolato" "/tʃok.ko.ˈla.to/" \
  "chocolate" "/ʃu.ku.ˈla.tɨ/" \
  "σοκολάτα" "/so.ko.ˈla.ta/"

put_word "ice_cream" "food" "advanced" \
  "$U/photo-1497034825429-c343d7c6a68f?w=300&h=300&fit=crop" \
  "$U/photo-1481391319762-47dff72954d9?w=300&h=300&fit=crop" \
  "$U/photo-1547592166-23ac45744acd?w=300&h=300&fit=crop" \
  "ice cream" "/aɪs kriːm/" \
  "helado" "/e.ˈla.ðo/" \
  "glace" "/ɡlas/" \
  "Eiscreme" "/ˈaɪ̯s.kʁeːm/" \
  "gelato" "/dʒe.ˈla.to/" \
  "sorvete" "/soɾ.ˈve.tɨ/" \
  "παγωτό" "/pa.ɣo.ˈto/"

put_word "honey" "food" "advanced" \
  "$U/photo-1587049352846-4a222e784d38?w=300&h=300&fit=crop" \
  "$U/photo-1497034825429-c343d7c6a68f?w=300&h=300&fit=crop" \
  "$U/photo-1481391319762-47dff72954d9?w=300&h=300&fit=crop" \
  "honey" "/ˈhʌn.i/" \
  "miel" "/mjel/" \
  "miel" "/mjɛl/" \
  "Honig" "/ˈhoː.nɪç/" \
  "miele" "/ˈmjɛ.le/" \
  "mel" "/ˈmɛɫ/" \
  "μέλι" "/ˈme.li/"

put_word "butter" "food" "advanced" \
  "$U/photo-1589985270826-4b7bb135bc9d?w=300&h=300&fit=crop" \
  "$U/photo-1587049352846-4a222e784d38?w=300&h=300&fit=crop" \
  "$U/photo-1497034825429-c343d7c6a68f?w=300&h=300&fit=crop" \
  "butter" "/ˈbʌt.ər/" \
  "mantequilla" "/man.te.ˈki.ʎa/" \
  "beurre" "/bœʁ/" \
  "Butter" "/ˈbʊ.tɐ/" \
  "burro" "/ˈbur.ro/" \
  "manteiga" "/mɐ̃.ˈtej.ɡɐ/" \
  "βούτυρο" "/ˈvu.ti.ro/"

put_word "chicken" "food" "advanced" \
  "$U/photo-1587593810167-a84920ea0781?w=300&h=300&fit=crop" \
  "$U/photo-1589985270826-4b7bb135bc9d?w=300&h=300&fit=crop" \
  "$U/photo-1547592166-23ac45744acd?w=300&h=300&fit=crop" \
  "chicken" "/ˈtʃɪk.ɪn/" \
  "pollo" "/ˈpo.ʎo/" \
  "poulet" "/pu.lɛ/" \
  "Hähnchen" "/ˈhɛːn.çən/" \
  "pollo" "/ˈpol.lo/" \
  "frango" "/ˈfɾɐ̃.ɡu/" \
  "κοτόπουλο" "/ko.ˈto.pu.lo/"

put_word "cake" "food" "advanced" \
  "$U/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop" \
  "$U/photo-1587593810167-a84920ea0781?w=300&h=300&fit=crop" \
  "$U/photo-1481391319762-47dff72954d9?w=300&h=300&fit=crop" \
  "cake" "/keɪk/" \
  "pastel" "/pas.ˈtel/" \
  "gâteau" "/ɡɑ.to/" \
  "Kuchen" "/ˈkuː.xən/" \
  "torta" "/ˈtor.ta/" \
  "bolo" "/ˈbo.lu/" \
  "κέικ" "/keik/"


# =============================================================================
# 🎨 COLORS — Beginner (5 words)
# =============================================================================
echo ""
echo "=== 🎨 COLORS — Beginner ==="

put_word "beige" "colors" "beginner" \
  "$U/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop" \
  "$U/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop" \
  "$U/photo-1558591710-4b4a1ae0f04d?w=300&h=300&fit=crop" \
  "beige" "/beɪʒ/" \
  "beige" "/beis/" \
  "beige" "/bɛʒ/" \
  "Beige" "/beːʃ/" \
  "beige" "/bɛʒ/" \
  "bege" "/ˈbɛ.ʒɨ/" \
  "μπεζ" "/bez/"

put_word "ivory" "colors" "beginner" \
  "$U/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop" \
  "$U/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop" \
  "$U/photo-1558591710-4b4a1ae0f04d?w=300&h=300&fit=crop" \
  "ivory" "/ˈaɪ.vər.i/" \
  "marfil" "/maɾ.ˈfil/" \
  "ivoire" "/i.vwaʁ/" \
  "Elfenbein" "/ˈɛl.fən.baɪ̯n/" \
  "avorio" "/a.ˈvɔ.rjo/" \
  "marfim" "/maɾ.ˈfĩ/" \
  "ιβουάρ" "/i.vu.ˈar/"

put_word "olive" "colors" "beginner" \
  "$U/photo-1558591710-4b4a1ae0f04d?w=300&h=300&fit=crop" \
  "$U/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop" \
  "$U/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop" \
  "olive" "/ˈɒl.ɪv/" \
  "oliva" "/o.ˈli.βa/" \
  "olive" "/ɔ.liv/" \
  "Olivgrün" "/o.ˈliːf.ɡʁyːn/" \
  "oliva" "/o.ˈli.va/" \
  "oliva" "/o.ˈli.vɐ/" \
  "λαδί" "/la.ˈði/"

put_word "teal" "colors" "beginner" \
  "$U/photo-1557683316-973673baf926?w=300&h=300&fit=crop" \
  "$U/photo-1558591710-4b4a1ae0f04d?w=300&h=300&fit=crop" \
  "$U/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop" \
  "teal" "/tiːl/" \
  "verde azulado" "/ˈbeɾ.ðe a.θu.ˈla.ðo/" \
  "sarcelle" "/saʁ.sɛl/" \
  "Blaugrün" "/ˈblaʊ̯.ɡʁyːn/" \
  "foglia di tè" "/ˈfɔʎ.ʎa di tɛ/" \
  "azul-petróleo" "/a.ˈzuɫ pe.ˈtɾɔ.lju/" \
  "πετρόλ" "/pe.ˈtrol/"

put_word "coral" "colors" "beginner" \
  "$U/photo-1557683311-eac922347aa1?w=300&h=300&fit=crop" \
  "$U/photo-1557683316-973673baf926?w=300&h=300&fit=crop" \
  "$U/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop" \
  "coral" "/ˈkɒr.əl/" \
  "coral" "/ko.ˈɾal/" \
  "corail" "/kɔ.ʁaj/" \
  "Koralle" "/ko.ˈʁa.lə/" \
  "corallo" "/ko.ˈral.lo/" \
  "coral" "/ko.ˈɾaɫ/" \
  "κοραλλί" "/ko.ra.ˈli/"

# =============================================================================
# 🎨 COLORS — Intermediate (5 words)
# =============================================================================
echo ""
echo "=== 🎨 COLORS — Intermediate ==="

put_word "maroon" "colors" "intermediate" \
  "$U/photo-1557682224-5b8590cd9ec5?w=300&h=300&fit=crop" \
  "$U/photo-1557683311-eac922347aa1?w=300&h=300&fit=crop" \
  "$U/photo-1557683316-973673baf926?w=300&h=300&fit=crop" \
  "maroon" "/mə.ˈruːn/" \
  "granate" "/ɡɾa.ˈna.te/" \
  "bordeaux" "/bɔʁ.do/" \
  "Kastanienbraun" "/kas.ˈtaː.ni.ən.bʁaʊ̯n/" \
  "marrone scuro" "/mar.ˈro.ne ˈsku.ro/" \
  "castanho" "/kɐʃ.ˈtɐ.ɲu/" \
  "καστανό" "/kas.ta.ˈno/"

put_word "navy" "colors" "intermediate" \
  "$U/photo-1557682260-96773eb01377?w=300&h=300&fit=crop" \
  "$U/photo-1557682224-5b8590cd9ec5?w=300&h=300&fit=crop" \
  "$U/photo-1557683311-eac922347aa1?w=300&h=300&fit=crop" \
  "navy" "/ˈneɪ.vi/" \
  "azul marino" "/a.ˈθul ma.ˈɾi.no/" \
  "bleu marine" "/blø ma.ʁin/" \
  "Marineblau" "/ma.ˈʁiː.nə.blaʊ̯/" \
  "blu navy" "/blu ˈnɛ.vi/" \
  "azul-marinho" "/a.ˈzuɫ ma.ˈɾi.ɲu/" \
  "ναυτικό μπλε" "/naf.ti.ˈko ble/"

put_word "lavender" "colors" "intermediate" \
  "$U/photo-1468327768560-75b778cbb551?w=300&h=300&fit=crop" \
  "$U/photo-1557682260-96773eb01377?w=300&h=300&fit=crop" \
  "$U/photo-1557682224-5b8590cd9ec5?w=300&h=300&fit=crop" \
  "lavender" "/ˈlæv.ɪn.dər/" \
  "lavanda" "/la.ˈβan.da/" \
  "lavande" "/la.vɑ̃d/" \
  "Lavendel" "/la.ˈvɛn.dəl/" \
  "lavanda" "/la.ˈvan.da/" \
  "lavanda" "/la.ˈvɐ̃.dɐ/" \
  "λεβάντα" "/le.ˈvan.da/"

put_word "indigo" "colors" "intermediate" \
  "$U/photo-1557682268-e3955ed5d83f?w=300&h=300&fit=crop" \
  "$U/photo-1468327768560-75b778cbb551?w=300&h=300&fit=crop" \
  "$U/photo-1557682260-96773eb01377?w=300&h=300&fit=crop" \
  "indigo" "/ˈɪn.dɪ.ɡoʊ/" \
  "índigo" "/ˈin.di.ɣo/" \
  "indigo" "/ɛ̃.di.ɡo/" \
  "Indigo" "/ˈɪn.di.ɡo/" \
  "indaco" "/ˈin.da.ko/" \
  "índigo" "/ˈĩ.di.ɡu/" \
  "λουλακί" "/lu.la.ˈki/"

put_word "amber" "colors" "intermediate" \
  "$U/photo-1557682257-2f9c37a3a5f3?w=300&h=300&fit=crop" \
  "$U/photo-1557682268-e3955ed5d83f?w=300&h=300&fit=crop" \
  "$U/photo-1468327768560-75b778cbb551?w=300&h=300&fit=crop" \
  "amber" "/ˈæm.bər/" \
  "ámbar" "/ˈam.baɾ/" \
  "ambre" "/ɑ̃bʁ/" \
  "Bernstein" "/ˈbɛʁn.ʃtaɪ̯n/" \
  "ambra" "/ˈam.bra/" \
  "âmbar" "/ˈɐ̃.baɾ/" \
  "κεχριμπαρί" "/kex.ri.ba.ˈri/"

# =============================================================================
# 🎨 COLORS — Advanced (4 words)
# =============================================================================
echo ""
echo "=== 🎨 COLORS — Advanced ==="

put_word "crimson" "colors" "advanced" \
  "$U/photo-1557682233-43e671455dfa?w=300&h=300&fit=crop" \
  "$U/photo-1557682257-2f9c37a3a5f3?w=300&h=300&fit=crop" \
  "$U/photo-1557682224-5b8590cd9ec5?w=300&h=300&fit=crop" \
  "crimson" "/ˈkrɪm.zən/" \
  "carmesí" "/kaɾ.me.ˈsi/" \
  "cramoisi" "/kʁa.mwa.zi/" \
  "Karmesinrot" "/kaʁ.me.ˈziːn.ʁoːt/" \
  "cremisi" "/ˈkre.mi.zi/" \
  "carmesim" "/kaɾ.me.ˈzĩ/" \
  "βυσσινί" "/vi.si.ˈni/"

put_word "magenta" "colors" "advanced" \
  "$U/photo-1557682204-e53c2b876ef4?w=300&h=300&fit=crop" \
  "$U/photo-1557682233-43e671455dfa?w=300&h=300&fit=crop" \
  "$U/photo-1557682257-2f9c37a3a5f3?w=300&h=300&fit=crop" \
  "magenta" "/mə.ˈdʒen.tə/" \
  "magenta" "/ma.ˈxen.ta/" \
  "magenta" "/ma.ʒɛ̃.ta/" \
  "Magenta" "/ma.ˈɡɛn.ta/" \
  "magenta" "/ma.ˈdʒɛn.ta/" \
  "magenta" "/ma.ˈʒẽ.tɐ/" \
  "ματζέντα" "/ma.ˈdzen.da/"

put_word "scarlet" "colors" "advanced" \
  "$U/photo-1557682196-a0d3e4e52c53?w=300&h=300&fit=crop" \
  "$U/photo-1557682204-e53c2b876ef4?w=300&h=300&fit=crop" \
  "$U/photo-1557682233-43e671455dfa?w=300&h=300&fit=crop" \
  "scarlet" "/ˈskɑːr.lət/" \
  "escarlata" "/es.kaɾ.ˈla.ta/" \
  "écarlate" "/e.kaʁ.lat/" \
  "Scharlachrot" "/ˈʃaʁ.lax.ʁoːt/" \
  "scarlatto" "/skar.ˈlat.to/" \
  "escarlate" "/iʃ.kaɾ.ˈla.tɨ/" \
  "άλικο" "/ˈa.li.ko/"

put_word "bronze" "colors" "advanced" \
  "$U/photo-1557682220-e7c4a5e8174d?w=300&h=300&fit=crop" \
  "$U/photo-1557682196-a0d3e4e52c53?w=300&h=300&fit=crop" \
  "$U/photo-1557682204-e53c2b876ef4?w=300&h=300&fit=crop" \
  "bronze" "/brɒnz/" \
  "bronce" "/ˈbɾon.θe/" \
  "bronze" "/bʁɔ̃z/" \
  "Bronze" "/ˈbʁɔ̃.sə/" \
  "bronzo" "/ˈbron.dzo/" \
  "bronze" "/ˈbɾõ.zɨ/" \
  "μπρούντζος" "/ˈbrun.dzos/"


# =============================================================================
# 🔢 NUMBERS — Beginner (6 words)
# =============================================================================
echo ""
echo "=== 🔢 NUMBERS — Beginner ==="

put_word "eleven" "numbers" "beginner" \
  "$U/photo-1596495577886-d920f1fb7238?w=300&h=300&fit=crop" \
  "$U/photo-1596495578065-6e0d4d7b7e4e?w=300&h=300&fit=crop" \
  "$U/photo-1596495578281-5b8590cd9ec5?w=300&h=300&fit=crop" \
  "eleven" "/ɪ.ˈlev.ən/" \
  "once" "/ˈon.θe/" \
  "onze" "/ɔ̃z/" \
  "elf" "/ɛlf/" \
  "undici" "/ˈun.di.tʃi/" \
  "onze" "/ˈõ.zɨ/" \
  "έντεκα" "/ˈen.de.ka/"

put_word "twelve" "numbers" "beginner" \
  "$U/photo-1596495578065-6e0d4d7b7e4e?w=300&h=300&fit=crop" \
  "$U/photo-1596495577886-d920f1fb7238?w=300&h=300&fit=crop" \
  "$U/photo-1596495578281-5b8590cd9ec5?w=300&h=300&fit=crop" \
  "twelve" "/twelv/" \
  "doce" "/ˈdo.θe/" \
  "douze" "/duz/" \
  "zwölf" "/tsvœlf/" \
  "dodici" "/ˈdo.di.tʃi/" \
  "doze" "/ˈdo.zɨ/" \
  "δώδεκα" "/ˈðo.ðe.ka/"

put_word "twenty" "numbers" "beginner" \
  "$U/photo-1596495578281-5b8590cd9ec5?w=300&h=300&fit=crop" \
  "$U/photo-1596495577886-d920f1fb7238?w=300&h=300&fit=crop" \
  "$U/photo-1596495578065-6e0d4d7b7e4e?w=300&h=300&fit=crop" \
  "twenty" "/ˈtwen.ti/" \
  "veinte" "/ˈbejn.te/" \
  "vingt" "/vɛ̃/" \
  "zwanzig" "/ˈtsvan.tsɪç/" \
  "venti" "/ˈven.ti/" \
  "vinte" "/ˈvĩ.tɨ/" \
  "είκοσι" "/ˈi.ko.si/"

put_word "thirty" "numbers" "beginner" \
  "$U/photo-1635070041078-e363dbe005cb?w=300&h=300&fit=crop" \
  "$U/photo-1596495578281-5b8590cd9ec5?w=300&h=300&fit=crop" \
  "$U/photo-1596495577886-d920f1fb7238?w=300&h=300&fit=crop" \
  "thirty" "/ˈθɜːr.ti/" \
  "treinta" "/ˈtɾejn.ta/" \
  "trente" "/tʁɑ̃t/" \
  "dreißig" "/ˈdʁaɪ̯.sɪç/" \
  "trenta" "/ˈtren.ta/" \
  "trinta" "/ˈtɾĩ.tɐ/" \
  "τριάντα" "/tri.ˈan.da/"

put_word "fifty" "numbers" "beginner" \
  "$U/photo-1635070041409-e363dbe005cb?w=300&h=300&fit=crop" \
  "$U/photo-1635070041078-e363dbe005cb?w=300&h=300&fit=crop" \
  "$U/photo-1596495578281-5b8590cd9ec5?w=300&h=300&fit=crop" \
  "fifty" "/ˈfɪf.ti/" \
  "cincuenta" "/θiŋ.ˈkwen.ta/" \
  "cinquante" "/sɛ̃.kɑ̃t/" \
  "fünfzig" "/ˈfʏnf.tsɪç/" \
  "cinquanta" "/tʃiŋ.ˈkwan.ta/" \
  "cinquenta" "/sĩ.ˈkwẽ.tɐ/" \
  "πενήντα" "/pe.ˈnin.da/"

put_word "half" "numbers" "beginner" \
  "$U/photo-1509228468518-180dd4864904?w=300&h=300&fit=crop" \
  "$U/photo-1635070041409-e363dbe005cb?w=300&h=300&fit=crop" \
  "$U/photo-1635070041078-e363dbe005cb?w=300&h=300&fit=crop" \
  "half" "/hæf/" \
  "mitad" "/mi.ˈtað/" \
  "moitié" "/mwa.tje/" \
  "Hälfte" "/ˈhɛlf.tə/" \
  "metà" "/me.ˈta/" \
  "metade" "/me.ˈta.dɨ/" \
  "μισό" "/mi.ˈso/"

# =============================================================================
# 🔢 NUMBERS — Intermediate (5 words)
# =============================================================================
echo ""
echo "=== 🔢 NUMBERS — Intermediate ==="

put_word "thirteen" "numbers" "intermediate" \
  "$U/photo-1611532736597-de2d4265fba3?w=300&h=300&fit=crop" \
  "$U/photo-1509228468518-180dd4864904?w=300&h=300&fit=crop" \
  "$U/photo-1635070041409-e363dbe005cb?w=300&h=300&fit=crop" \
  "thirteen" "/ˌθɜːrˈtiːn/" \
  "trece" "/ˈtɾe.θe/" \
  "treize" "/tʁɛz/" \
  "dreizehn" "/ˈdʁaɪ̯.tseːn/" \
  "tredici" "/ˈtre.di.tʃi/" \
  "treze" "/ˈtɾe.zɨ/" \
  "δεκατρία" "/ðe.ka.ˈtri.a/"

put_word "fourteen" "numbers" "intermediate" \
  "$U/photo-1611532736597-de2d4265fba4?w=300&h=300&fit=crop" \
  "$U/photo-1611532736597-de2d4265fba3?w=300&h=300&fit=crop" \
  "$U/photo-1509228468518-180dd4864904?w=300&h=300&fit=crop" \
  "fourteen" "/ˌfɔːrˈtiːn/" \
  "catorce" "/ka.ˈtoɾ.θe/" \
  "quatorze" "/ka.tɔʁz/" \
  "vierzehn" "/ˈfɪʁ.tseːn/" \
  "quattordici" "/kwat.ˈtor.di.tʃi/" \
  "catorze" "/ka.ˈtoɾ.zɨ/" \
  "δεκατέσσερα" "/ðe.ka.ˈte.se.ra/"

put_word "fifteen" "numbers" "intermediate" \
  "$U/photo-1611532736597-de2d4265fba5?w=300&h=300&fit=crop" \
  "$U/photo-1611532736597-de2d4265fba4?w=300&h=300&fit=crop" \
  "$U/photo-1611532736597-de2d4265fba3?w=300&h=300&fit=crop" \
  "fifteen" "/ˌfɪfˈtiːn/" \
  "quince" "/ˈkin.θe/" \
  "quinze" "/kɛ̃z/" \
  "fünfzehn" "/ˈfʏnf.tseːn/" \
  "quindici" "/ˈkwin.di.tʃi/" \
  "quinze" "/ˈkĩ.zɨ/" \
  "δεκαπέντε" "/ðe.ka.ˈpen.de/"

put_word "double" "numbers" "intermediate" \
  "$U/photo-1594322436404-5a0526db4d13?w=300&h=300&fit=crop" \
  "$U/photo-1611532736597-de2d4265fba5?w=300&h=300&fit=crop" \
  "$U/photo-1509228468518-180dd4864904?w=300&h=300&fit=crop" \
  "double" "/ˈdʌb.əl/" \
  "doble" "/ˈdo.βle/" \
  "double" "/dubl/" \
  "doppelt" "/ˈdɔ.pəlt/" \
  "doppio" "/ˈdop.pjo/" \
  "dobro" "/ˈdo.bɾu/" \
  "διπλό" "/ði.ˈplo/"

put_word "quarter" "numbers" "intermediate" \
  "$U/photo-1594322436404-5a0526db4d14?w=300&h=300&fit=crop" \
  "$U/photo-1594322436404-5a0526db4d13?w=300&h=300&fit=crop" \
  "$U/photo-1611532736597-de2d4265fba5?w=300&h=300&fit=crop" \
  "quarter" "/ˈkwɔːr.tər/" \
  "cuarto" "/ˈkwaɾ.to/" \
  "quart" "/kaʁ/" \
  "Viertel" "/ˈfɪʁ.təl/" \
  "quarto" "/ˈkwar.to/" \
  "quarto" "/ˈkwaɾ.tu/" \
  "τέταρτο" "/ˈte.tar.to/"

# =============================================================================
# 🔢 NUMBERS — Advanced (5 words)
# =============================================================================
echo ""
echo "=== 🔢 NUMBERS — Advanced ==="

put_word "triple" "numbers" "advanced" \
  "$U/photo-1594322436404-5a0526db4d15?w=300&h=300&fit=crop" \
  "$U/photo-1594322436404-5a0526db4d14?w=300&h=300&fit=crop" \
  "$U/photo-1594322436404-5a0526db4d13?w=300&h=300&fit=crop" \
  "triple" "/ˈtrɪp.əl/" \
  "triple" "/ˈtɾi.ple/" \
  "triple" "/tʁipl/" \
  "dreifach" "/ˈdʁaɪ̯.fax/" \
  "triplo" "/ˈtri.plo/" \
  "triplo" "/ˈtɾi.plu/" \
  "τριπλό" "/tri.ˈplo/"

put_word "first" "numbers" "advanced" \
  "$U/photo-1533228876829-65c94e7b5025?w=300&h=300&fit=crop" \
  "$U/photo-1594322436404-5a0526db4d15?w=300&h=300&fit=crop" \
  "$U/photo-1594322436404-5a0526db4d14?w=300&h=300&fit=crop" \
  "first" "/fɜːrst/" \
  "primero" "/pɾi.ˈme.ɾo/" \
  "premier" "/pʁə.mje/" \
  "erste" "/ˈeːɐ̯s.tə/" \
  "primo" "/ˈpri.mo/" \
  "primeiro" "/pɾi.ˈmej.ɾu/" \
  "πρώτος" "/ˈpro.tos/"

put_word "second" "numbers" "advanced" \
  "$U/photo-1533228876829-65c94e7b5026?w=300&h=300&fit=crop" \
  "$U/photo-1533228876829-65c94e7b5025?w=300&h=300&fit=crop" \
  "$U/photo-1594322436404-5a0526db4d15?w=300&h=300&fit=crop" \
  "second" "/ˈsek.ənd/" \
  "segundo" "/se.ˈɣun.do/" \
  "deuxième" "/dø.zjɛm/" \
  "zweite" "/ˈtsvaɪ̯.tə/" \
  "secondo" "/se.ˈkon.do/" \
  "segundo" "/se.ˈɡũ.du/" \
  "δεύτερος" "/ˈðef.te.ros/"

put_word "third" "numbers" "advanced" \
  "$U/photo-1533228876829-65c94e7b5027?w=300&h=300&fit=crop" \
  "$U/photo-1533228876829-65c94e7b5026?w=300&h=300&fit=crop" \
  "$U/photo-1533228876829-65c94e7b5025?w=300&h=300&fit=crop" \
  "third" "/θɜːrd/" \
  "tercero" "/teɾ.ˈθe.ɾo/" \
  "troisième" "/tʁwa.zjɛm/" \
  "dritte" "/ˈdʁɪ.tə/" \
  "terzo" "/ˈter.tso/" \
  "terceiro" "/teɾ.ˈsej.ɾu/" \
  "τρίτος" "/ˈtri.tos/"

put_word "last" "numbers" "advanced" \
  "$U/photo-1533228876829-65c94e7b5028?w=300&h=300&fit=crop" \
  "$U/photo-1533228876829-65c94e7b5027?w=300&h=300&fit=crop" \
  "$U/photo-1533228876829-65c94e7b5026?w=300&h=300&fit=crop" \
  "last" "/lɑːst/" \
  "último" "/ˈul.ti.mo/" \
  "dernier" "/dɛʁ.nje/" \
  "letzte" "/ˈlɛts.tə/" \
  "ultimo" "/ˈul.ti.mo/" \
  "último" "/ˈuɫ.ti.mu/" \
  "τελευταίος" "/te.lef.ˈte.os/"


# =============================================================================
# 🪑 OBJECTS — Beginner (8 words)
# =============================================================================
echo ""
echo "=== 🪑 OBJECTS — Beginner ==="

put_word "pen" "objects" "beginner" \
  "$U/photo-1585336261022-680e295ce3fe?w=300&h=300&fit=crop" \
  "$U/photo-1513542789411-b6a5d4f31634?w=300&h=300&fit=crop" \
  "$U/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop" \
  "pen" "/pen/" \
  "bolígrafo" "/bo.ˈli.ɣɾa.fo/" \
  "stylo" "/sti.lo/" \
  "Kugelschreiber" "/ˈkuː.ɡəl.ʃʁaɪ̯.bɐ/" \
  "penna" "/ˈpen.na/" \
  "caneta" "/kɐ.ˈne.tɐ/" \
  "στυλό" "/sti.ˈlo/"

put_word "bag" "objects" "beginner" \
  "$U/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop" \
  "$U/photo-1585336261022-680e295ce3fe?w=300&h=300&fit=crop" \
  "$U/photo-1513542789411-b6a5d4f31634?w=300&h=300&fit=crop" \
  "bag" "/bæɡ/" \
  "bolsa" "/ˈbol.sa/" \
  "sac" "/sak/" \
  "Tasche" "/ˈta.ʃə/" \
  "borsa" "/ˈbor.sa/" \
  "bolsa" "/ˈboɫ.sɐ/" \
  "τσάντα" "/ˈtsan.da/"

put_word "shoe" "objects" "beginner" \
  "$U/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop" \
  "$U/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop" \
  "$U/photo-1585336261022-680e295ce3fe?w=300&h=300&fit=crop" \
  "shoe" "/ʃuː/" \
  "zapato" "/θa.ˈpa.to/" \
  "chaussure" "/ʃo.syʁ/" \
  "Schuh" "/ʃuː/" \
  "scarpa" "/ˈskar.pa/" \
  "sapato" "/sɐ.ˈpa.tu/" \
  "παπούτσι" "/pa.ˈpu.tsi/"

put_word "hat" "objects" "beginner" \
  "$U/photo-1521369909029-2afed882baee?w=300&h=300&fit=crop" \
  "$U/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop" \
  "$U/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop" \
  "hat" "/hæt/" \
  "sombrero" "/som.ˈbɾe.ɾo/" \
  "chapeau" "/ʃa.po/" \
  "Hut" "/huːt/" \
  "cappello" "/kap.ˈpel.lo/" \
  "chapéu" "/ʃɐ.ˈpɛw/" \
  "καπέλο" "/ka.ˈpe.lo/"

put_word "door" "objects" "beginner" \
  "$U/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop" \
  "$U/photo-1521369909029-2afed882baee?w=300&h=300&fit=crop" \
  "$U/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop" \
  "door" "/dɔːr/" \
  "puerta" "/ˈpweɾ.ta/" \
  "porte" "/pɔʁt/" \
  "Tür" "/tyːɐ̯/" \
  "porta" "/ˈpɔr.ta/" \
  "porta" "/ˈpoɾ.tɐ/" \
  "πόρτα" "/ˈpor.ta/"

put_word "bed" "objects" "beginner" \
  "$U/photo-1505693416388-ac5ce068fe85?w=300&h=300&fit=crop" \
  "$U/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop" \
  "$U/photo-1521369909029-2afed882baee?w=300&h=300&fit=crop" \
  "bed" "/bed/" \
  "cama" "/ˈka.ma/" \
  "lit" "/li/" \
  "Bett" "/bɛt/" \
  "letto" "/ˈlet.to/" \
  "cama" "/ˈkɐ.mɐ/" \
  "κρεβάτι" "/kre.ˈva.ti/"

put_word "bottle" "objects" "beginner" \
  "$U/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop" \
  "$U/photo-1505693416388-ac5ce068fe85?w=300&h=300&fit=crop" \
  "$U/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop" \
  "bottle" "/ˈbɒt.əl/" \
  "botella" "/bo.ˈte.ʎa/" \
  "bouteille" "/bu.tɛj/" \
  "Flasche" "/ˈfla.ʃə/" \
  "bottiglia" "/bot.ˈtiʎ.ʎa/" \
  "garrafa" "/ɡɐ.ˈʁa.fɐ/" \
  "μπουκάλι" "/bu.ˈka.li/"

put_word "box" "objects" "beginner" \
  "$U/photo-1603400521630-9f2de124b33b?w=300&h=300&fit=crop" \
  "$U/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop" \
  "$U/photo-1505693416388-ac5ce068fe85?w=300&h=300&fit=crop" \
  "box" "/bɒks/" \
  "caja" "/ˈka.xa/" \
  "boîte" "/bwat/" \
  "Kiste" "/ˈkɪs.tə/" \
  "scatola" "/ˈska.to.la/" \
  "caixa" "/ˈkaj.ʃɐ/" \
  "κουτί" "/ku.ˈti/"


# =============================================================================
# 🪑 OBJECTS — Intermediate (8 words)
# =============================================================================
echo ""
echo "=== 🪑 OBJECTS — Intermediate ==="

put_word "mirror" "objects" "intermediate" \
  "$U/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop" \
  "$U/photo-1603400521630-9f2de124b33b?w=300&h=300&fit=crop" \
  "$U/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop" \
  "mirror" "/ˈmɪr.ər/" \
  "espejo" "/es.ˈpe.xo/" \
  "miroir" "/mi.ʁwaʁ/" \
  "Spiegel" "/ˈʃpiː.ɡəl/" \
  "specchio" "/ˈspek.kjo/" \
  "espelho" "/iʃ.ˈpe.ʎu/" \
  "καθρέφτης" "/ka.ˈθref.tis/"

put_word "window" "objects" "intermediate" \
  "$U/photo-1513694203232-719a280e022f?w=300&h=300&fit=crop" \
  "$U/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop" \
  "$U/photo-1603400521630-9f2de124b33b?w=300&h=300&fit=crop" \
  "window" "/ˈwɪn.doʊ/" \
  "ventana" "/ben.ˈta.na/" \
  "fenêtre" "/fə.nɛtʁ/" \
  "Fenster" "/ˈfɛns.tɐ/" \
  "finestra" "/fi.ˈnes.tra/" \
  "janela" "/ʒɐ.ˈnɛ.lɐ/" \
  "παράθυρο" "/pa.ˈra.θi.ro/"

put_word "pillow" "objects" "intermediate" \
  "$U/photo-1584100936595-c0654b55a2e2?w=300&h=300&fit=crop" \
  "$U/photo-1513694203232-719a280e022f?w=300&h=300&fit=crop" \
  "$U/photo-1505693416388-ac5ce068fe85?w=300&h=300&fit=crop" \
  "pillow" "/ˈpɪl.oʊ/" \
  "almohada" "/al.mo.ˈa.ða/" \
  "oreiller" "/ɔ.ʁɛ.je/" \
  "Kissen" "/ˈkɪ.sən/" \
  "cuscino" "/ku.ˈʃi.no/" \
  "almofada" "/aɫ.mu.ˈfa.dɐ/" \
  "μαξιλάρι" "/ma.ksi.ˈla.ri/"

put_word "plate" "objects" "intermediate" \
  "$U/photo-1578749556568-bc2c40e68b61?w=300&h=300&fit=crop" \
  "$U/photo-1584100936595-c0654b55a2e2?w=300&h=300&fit=crop" \
  "$U/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop" \
  "plate" "/pleɪt/" \
  "plato" "/ˈpla.to/" \
  "assiette" "/a.sjɛt/" \
  "Teller" "/ˈtɛ.lɐ/" \
  "piatto" "/ˈpjat.to/" \
  "prato" "/ˈpɾa.tu/" \
  "πιάτο" "/ˈpja.to/"

put_word "fork" "objects" "intermediate" \
  "$U/photo-1584568694244-14fbdf83bd30?w=300&h=300&fit=crop" \
  "$U/photo-1578749556568-bc2c40e68b61?w=300&h=300&fit=crop" \
  "$U/photo-1584100936595-c0654b55a2e2?w=300&h=300&fit=crop" \
  "fork" "/fɔːrk/" \
  "tenedor" "/te.ne.ˈðoɾ/" \
  "fourchette" "/fuʁ.ʃɛt/" \
  "Gabel" "/ˈɡaː.bəl/" \
  "forchetta" "/for.ˈket.ta/" \
  "garfo" "/ˈɡaɾ.fu/" \
  "πιρούνι" "/pi.ˈru.ni/"

put_word "knife" "objects" "intermediate" \
  "$U/photo-1593618998160-e34014e67546?w=300&h=300&fit=crop" \
  "$U/photo-1584568694244-14fbdf83bd30?w=300&h=300&fit=crop" \
  "$U/photo-1578749556568-bc2c40e68b61?w=300&h=300&fit=crop" \
  "knife" "/naɪf/" \
  "cuchillo" "/ku.ˈtʃi.ʎo/" \
  "couteau" "/ku.to/" \
  "Messer" "/ˈmɛ.sɐ/" \
  "coltello" "/kol.ˈtel.lo/" \
  "faca" "/ˈfa.kɐ/" \
  "μαχαίρι" "/ma.ˈxe.ri/"

put_word "spoon" "objects" "intermediate" \
  "$U/photo-1590794056226-79ef3a8147e1?w=300&h=300&fit=crop" \
  "$U/photo-1593618998160-e34014e67546?w=300&h=300&fit=crop" \
  "$U/photo-1584568694244-14fbdf83bd30?w=300&h=300&fit=crop" \
  "spoon" "/spuːn/" \
  "cuchara" "/ku.ˈtʃa.ɾa/" \
  "cuillère" "/kɥi.jɛʁ/" \
  "Löffel" "/ˈlœ.fəl/" \
  "cucchiaio" "/kuk.ˈkja.jo/" \
  "colher" "/ku.ˈʎeɾ/" \
  "κουτάλι" "/ku.ˈta.li/"

put_word "candle" "objects" "intermediate" \
  "$U/photo-1602523961358-f9f03dd557db?w=300&h=300&fit=crop" \
  "$U/photo-1590794056226-79ef3a8147e1?w=300&h=300&fit=crop" \
  "$U/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop" \
  "candle" "/ˈkæn.dəl/" \
  "vela" "/ˈbe.la/" \
  "bougie" "/bu.ʒi/" \
  "Kerze" "/ˈkɛʁ.tsə/" \
  "candela" "/kan.ˈde.la/" \
  "vela" "/ˈvɛ.lɐ/" \
  "κερί" "/ke.ˈri/"


# =============================================================================
# 🪑 OBJECTS — Advanced (8 words)
# =============================================================================
echo ""
echo "=== 🪑 OBJECTS — Advanced ==="

put_word "scissors" "objects" "advanced" \
  "$U/photo-1585336261022-680e295ce3ff?w=300&h=300&fit=crop" \
  "$U/photo-1602523961358-f9f03dd557db?w=300&h=300&fit=crop" \
  "$U/photo-1590794056226-79ef3a8147e1?w=300&h=300&fit=crop" \
  "scissors" "/ˈsɪz.ərz/" \
  "tijeras" "/ti.ˈxe.ɾas/" \
  "ciseaux" "/si.zo/" \
  "Schere" "/ˈʃeː.ʁə/" \
  "forbici" "/ˈfor.bi.tʃi/" \
  "tesoura" "/tɨ.ˈzo.ɾɐ/" \
  "ψαλίδι" "/psa.ˈli.ði/"

put_word "brush" "objects" "advanced" \
  "$U/photo-1558317374-067fb5f30001?w=300&h=300&fit=crop" \
  "$U/photo-1585336261022-680e295ce3ff?w=300&h=300&fit=crop" \
  "$U/photo-1602523961358-f9f03dd557db?w=300&h=300&fit=crop" \
  "brush" "/brʌʃ/" \
  "cepillo" "/θe.ˈpi.ʎo/" \
  "brosse" "/bʁɔs/" \
  "Bürste" "/ˈbʏʁs.tə/" \
  "spazzola" "/ˈspat.tso.la/" \
  "escova" "/iʃ.ˈko.vɐ/" \
  "βούρτσα" "/ˈvur.tsa/"

put_word "bell" "objects" "advanced" \
  "$U/photo-1513151233558-d860c5398176?w=300&h=300&fit=crop" \
  "$U/photo-1558317374-067fb5f30001?w=300&h=300&fit=crop" \
  "$U/photo-1585336261022-680e295ce3ff?w=300&h=300&fit=crop" \
  "bell" "/bel/" \
  "campana" "/kam.ˈpa.na/" \
  "cloche" "/klɔʃ/" \
  "Glocke" "/ˈɡlɔ.kə/" \
  "campana" "/kam.ˈpa.na/" \
  "sino" "/ˈsi.nu/" \
  "καμπάνα" "/kam.ˈba.na/"

put_word "flag" "objects" "advanced" \
  "$U/photo-1569974507005-6dc61f97fb5c?w=300&h=300&fit=crop" \
  "$U/photo-1513151233558-d860c5398176?w=300&h=300&fit=crop" \
  "$U/photo-1558317374-067fb5f30001?w=300&h=300&fit=crop" \
  "flag" "/flæɡ/" \
  "bandera" "/ban.ˈde.ɾa/" \
  "drapeau" "/dʁa.po/" \
  "Flagge" "/ˈfla.ɡə/" \
  "bandiera" "/ban.ˈdjɛ.ra/" \
  "bandeira" "/bɐ̃.ˈdej.ɾɐ/" \
  "σημαία" "/si.ˈme.a/"

put_word "ladder" "objects" "advanced" \
  "$U/photo-1567538096630-e0c55bd6374c?w=300&h=300&fit=crop" \
  "$U/photo-1569974507005-6dc61f97fb5c?w=300&h=300&fit=crop" \
  "$U/photo-1513151233558-d860c5398176?w=300&h=300&fit=crop" \
  "ladder" "/ˈlæd.ər/" \
  "escalera" "/es.ka.ˈle.ɾa/" \
  "échelle" "/e.ʃɛl/" \
  "Leiter" "/ˈlaɪ̯.tɐ/" \
  "scala" "/ˈska.la/" \
  "escada" "/iʃ.ˈka.dɐ/" \
  "σκάλα" "/ˈska.la/"

put_word "wheel" "objects" "advanced" \
  "$U/photo-1558618666-fcd25c85f82f?w=300&h=300&fit=crop" \
  "$U/photo-1567538096630-e0c55bd6374c?w=300&h=300&fit=crop" \
  "$U/photo-1569974507005-6dc61f97fb5c?w=300&h=300&fit=crop" \
  "wheel" "/wiːl/" \
  "rueda" "/ˈrwe.ða/" \
  "roue" "/ʁu/" \
  "Rad" "/ʁaːt/" \
  "ruota" "/ˈrwɔ.ta/" \
  "roda" "/ˈʁɔ.dɐ/" \
  "ρόδα" "/ˈro.ða/"

put_word "rope" "objects" "advanced" \
  "$U/photo-1558618666-fcd25c85f830?w=300&h=300&fit=crop" \
  "$U/photo-1558618666-fcd25c85f82f?w=300&h=300&fit=crop" \
  "$U/photo-1567538096630-e0c55bd6374c?w=300&h=300&fit=crop" \
  "rope" "/roʊp/" \
  "cuerda" "/ˈkweɾ.ða/" \
  "corde" "/kɔʁd/" \
  "Seil" "/zaɪ̯l/" \
  "corda" "/ˈkor.da/" \
  "corda" "/ˈkoɾ.dɐ/" \
  "σχοινί" "/sxi.ˈni/"

put_word "pencil" "objects" "advanced" \
  "$U/photo-1513542789411-b6a5d4f31634?w=300&h=300&fit=crop" \
  "$U/photo-1585336261022-680e295ce3fe?w=300&h=300&fit=crop" \
  "$U/photo-1558618666-fcd25c85f830?w=300&h=300&fit=crop" \
  "pencil" "/ˈpen.səl/" \
  "lápiz" "/ˈla.piθ/" \
  "crayon" "/kʁɛ.jɔ̃/" \
  "Bleistift" "/ˈblaɪ̯.ʃtɪft/" \
  "matita" "/ma.ˈti.ta/" \
  "lápis" "/ˈla.piʃ/" \
  "μολύβι" "/mo.ˈli.vi/"


# =============================================================================
# 🌋 NATURE — Beginner (8 words)
# =============================================================================
echo ""
echo "=== 🌋 NATURE — Beginner ==="

put_word "lake" "nature" "beginner" \
  "$U/photo-1439066615861-d1af74d74000?w=300&h=300&fit=crop" \
  "$U/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop" \
  "$U/photo-1470071459604-3b5ec3a7fe05?w=300&h=300&fit=crop" \
  "lake" "/leɪk/" \
  "lago" "/ˈla.ɣo/" \
  "lac" "/lak/" \
  "See" "/zeː/" \
  "lago" "/ˈla.ɡo/" \
  "lago" "/ˈla.ɡu/" \
  "λίμνη" "/ˈlim.ni/"

put_word "beach" "nature" "beginner" \
  "$U/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop" \
  "$U/photo-1439066615861-d1af74d74000?w=300&h=300&fit=crop" \
  "$U/photo-1470071459604-3b5ec3a7fe05?w=300&h=300&fit=crop" \
  "beach" "/biːtʃ/" \
  "playa" "/ˈpla.ʝa/" \
  "plage" "/plaʒ/" \
  "Strand" "/ʃtʁant/" \
  "spiaggia" "/ˈspjad.dʒa/" \
  "praia" "/ˈpɾaj.ɐ/" \
  "παραλία" "/pa.ra.ˈli.a/"

put_word "wind" "nature" "beginner" \
  "$U/photo-1505672678657-cc7037095e60?w=300&h=300&fit=crop" \
  "$U/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop" \
  "$U/photo-1439066615861-d1af74d74000?w=300&h=300&fit=crop" \
  "wind" "/wɪnd/" \
  "viento" "/ˈbjen.to/" \
  "vent" "/vɑ̃/" \
  "Wind" "/vɪnt/" \
  "vento" "/ˈven.to/" \
  "vento" "/ˈvẽ.tu/" \
  "άνεμος" "/ˈa.ne.mos/"

put_word "fire" "nature" "beginner" \
  "$U/photo-1475552113915-6fcb52652ba2?w=300&h=300&fit=crop" \
  "$U/photo-1505672678657-cc7037095e60?w=300&h=300&fit=crop" \
  "$U/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop" \
  "fire" "/faɪər/" \
  "fuego" "/ˈfwe.ɣo/" \
  "feu" "/fø/" \
  "Feuer" "/ˈfɔɪ̯.ɐ/" \
  "fuoco" "/ˈfwɔ.ko/" \
  "fogo" "/ˈfo.ɡu/" \
  "φωτιά" "/fo.ˈtja/"

put_word "ice" "nature" "beginner" \
  "$U/photo-1489549132488-d00b7eee80f1?w=300&h=300&fit=crop" \
  "$U/photo-1475552113915-6fcb52652ba2?w=300&h=300&fit=crop" \
  "$U/photo-1505672678657-cc7037095e60?w=300&h=300&fit=crop" \
  "ice" "/aɪs/" \
  "hielo" "/ˈje.lo/" \
  "glace" "/ɡlas/" \
  "Eis" "/aɪ̯s/" \
  "ghiaccio" "/ˈɡjat.tʃo/" \
  "gelo" "/ˈʒe.lu/" \
  "πάγος" "/ˈpa.ɣos/"

put_word "stone" "nature" "beginner" \
  "$U/photo-1470071459604-3b5ec3a7fe05?w=300&h=300&fit=crop" \
  "$U/photo-1489549132488-d00b7eee80f1?w=300&h=300&fit=crop" \
  "$U/photo-1475552113915-6fcb52652ba2?w=300&h=300&fit=crop" \
  "stone" "/stoʊn/" \
  "piedra" "/ˈpje.ðɾa/" \
  "pierre" "/pjɛʁ/" \
  "Stein" "/ʃtaɪ̯n/" \
  "pietra" "/ˈpjɛ.tra/" \
  "pedra" "/ˈpe.dɾɐ/" \
  "πέτρα" "/ˈpe.tra/"

put_word "sand" "nature" "beginner" \
  "$U/photo-1509233725247-49e657c54213?w=300&h=300&fit=crop" \
  "$U/photo-1470071459604-3b5ec3a7fe05?w=300&h=300&fit=crop" \
  "$U/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop" \
  "sand" "/sænd/" \
  "arena" "/a.ˈɾe.na/" \
  "sable" "/sabl/" \
  "Sand" "/zant/" \
  "sabbia" "/ˈsab.bja/" \
  "areia" "/ɐ.ˈɾej.ɐ/" \
  "άμμος" "/ˈa.mos/"

put_word "wave" "nature" "beginner" \
  "$U/photo-1505118380757-91f5f5632de0?w=300&h=300&fit=crop" \
  "$U/photo-1509233725247-49e657c54213?w=300&h=300&fit=crop" \
  "$U/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop" \
  "wave" "/weɪv/" \
  "ola" "/ˈo.la/" \
  "vague" "/vaɡ/" \
  "Welle" "/ˈvɛ.lə/" \
  "onda" "/ˈon.da/" \
  "onda" "/ˈõ.dɐ/" \
  "κύμα" "/ˈci.ma/"


# =============================================================================
# 🌋 NATURE — Intermediate (8 words)
# =============================================================================
echo ""
echo "=== 🌋 NATURE — Intermediate ==="

put_word "volcano" "nature" "intermediate" \
  "$U/photo-1554232456-8727aae0cfa4?w=300&h=300&fit=crop" \
  "$U/photo-1505118380757-91f5f5632de0?w=300&h=300&fit=crop" \
  "$U/photo-1439066615861-d1af74d74000?w=300&h=300&fit=crop" \
  "volcano" "/vɒl.ˈkeɪ.noʊ/" \
  "volcán" "/bol.ˈkan/" \
  "volcan" "/vɔl.kɑ̃/" \
  "Vulkan" "/vʊl.ˈkaːn/" \
  "vulcano" "/vul.ˈka.no/" \
  "vulcão" "/vuɫ.ˈkɐ̃w̃/" \
  "ηφαίστειο" "/i.ˈfe.sti.o/"

put_word "desert" "nature" "intermediate" \
  "$U/photo-1509316785289-025f5b846b35?w=300&h=300&fit=crop" \
  "$U/photo-1554232456-8727aae0cfa4?w=300&h=300&fit=crop" \
  "$U/photo-1505118380757-91f5f5632de0?w=300&h=300&fit=crop" \
  "desert" "/ˈdez.ərt/" \
  "desierto" "/de.ˈsjeɾ.to/" \
  "désert" "/de.zɛʁ/" \
  "Wüste" "/ˈvʏs.tə/" \
  "deserto" "/de.ˈzɛr.to/" \
  "deserto" "/de.ˈzɛɾ.tu/" \
  "έρημος" "/ˈe.ri.mos/"

put_word "waterfall" "nature" "intermediate" \
  "$U/photo-1432405972618-c6b0252f2aec?w=300&h=300&fit=crop" \
  "$U/photo-1509316785289-025f5b846b35?w=300&h=300&fit=crop" \
  "$U/photo-1554232456-8727aae0cfa4?w=300&h=300&fit=crop" \
  "waterfall" "/ˈwɔː.tər.fɔːl/" \
  "cascada" "/kas.ˈka.ða/" \
  "cascade" "/kas.kad/" \
  "Wasserfall" "/ˈva.sɐ.fal/" \
  "cascata" "/kas.ˈka.ta/" \
  "cascata" "/kɐʃ.ˈka.tɐ/" \
  "καταρράκτης" "/ka.ta.ˈrak.tis/"

put_word "cave" "nature" "intermediate" \
  "$U/photo-1500740516770-92bd004b996e?w=300&h=300&fit=crop" \
  "$U/photo-1432405972618-c6b0252f2aec?w=300&h=300&fit=crop" \
  "$U/photo-1509316785289-025f5b846b35?w=300&h=300&fit=crop" \
  "cave" "/keɪv/" \
  "cueva" "/ˈkwe.βa/" \
  "grotte" "/ɡʁɔt/" \
  "Höhle" "/ˈhøː.lə/" \
  "grotta" "/ˈɡrɔt.ta/" \
  "caverna" "/ka.ˈvɛɾ.nɐ/" \
  "σπηλιά" "/spi.ˈlja/"

put_word "cliff" "nature" "intermediate" \
  "$U/photo-1464822759023-fed622ff2c3b?w=300&h=300&fit=crop" \
  "$U/photo-1500740516770-92bd004b996e?w=300&h=300&fit=crop" \
  "$U/photo-1432405972618-c6b0252f2aec?w=300&h=300&fit=crop" \
  "cliff" "/klɪf/" \
  "acantilado" "/a.kan.ti.ˈla.ðo/" \
  "falaise" "/fa.lɛz/" \
  "Klippe" "/ˈklɪ.pə/" \
  "scogliera" "/skoʎ.ˈʎɛ.ra/" \
  "falésia" "/fa.ˈlɛ.zjɐ/" \
  "γκρεμός" "/ɡre.ˈmos/"

put_word "valley" "nature" "intermediate" \
  "$U/photo-1501785888041-af3ef285b470?w=300&h=300&fit=crop" \
  "$U/photo-1464822759023-fed622ff2c3b?w=300&h=300&fit=crop" \
  "$U/photo-1500740516770-92bd004b996e?w=300&h=300&fit=crop" \
  "valley" "/ˈvæl.i/" \
  "valle" "/ˈba.ʎe/" \
  "vallée" "/va.le/" \
  "Tal" "/taːl/" \
  "valle" "/ˈval.le/" \
  "vale" "/ˈva.lɨ/" \
  "κοιλάδα" "/ki.ˈla.ða/"

put_word "lightning" "nature" "intermediate" \
  "$U/photo-1461511669078-d46bf351cd6e?w=300&h=300&fit=crop" \
  "$U/photo-1501785888041-af3ef285b470?w=300&h=300&fit=crop" \
  "$U/photo-1554232456-8727aae0cfa4?w=300&h=300&fit=crop" \
  "lightning" "/ˈlaɪt.nɪŋ/" \
  "relámpago" "/re.ˈlam.pa.ɣo/" \
  "éclair" "/e.klɛʁ/" \
  "Blitz" "/blɪts/" \
  "fulmine" "/ˈful.mi.ne/" \
  "relâmpago" "/ʁe.ˈlɐ̃.pɐ.ɡu/" \
  "αστραπή" "/as.tra.ˈpi/"

put_word "fog" "nature" "intermediate" \
  "$U/photo-1485236715568-ddc5ee6ca227?w=300&h=300&fit=crop" \
  "$U/photo-1461511669078-d46bf351cd6e?w=300&h=300&fit=crop" \
  "$U/photo-1505672678657-cc7037095e60?w=300&h=300&fit=crop" \
  "fog" "/fɒɡ/" \
  "niebla" "/ˈnje.βla/" \
  "brouillard" "/bʁu.jaʁ/" \
  "Nebel" "/ˈneː.bəl/" \
  "nebbia" "/ˈneb.bja/" \
  "nevoeiro" "/ne.vu.ˈej.ɾu/" \
  "ομίχλη" "/o.ˈmix.li/"


# =============================================================================
# 🌋 NATURE — Advanced (8 words)
# =============================================================================
echo ""
echo "=== 🌋 NATURE — Advanced ==="

put_word "glacier" "nature" "advanced" \
  "$U/photo-1476610182048-b716b8518aae?w=300&h=300&fit=crop" \
  "$U/photo-1485236715568-ddc5ee6ca227?w=300&h=300&fit=crop" \
  "$U/photo-1461511669078-d46bf351cd6e?w=300&h=300&fit=crop" \
  "glacier" "/ˈɡleɪ.ʃər/" \
  "glaciar" "/ɡla.ˈθjaɾ/" \
  "glacier" "/ɡla.sje/" \
  "Gletscher" "/ˈɡlɛ.tʃɐ/" \
  "ghiacciaio" "/ɡjat.ˈtʃa.jo/" \
  "glaciar" "/ɡla.si.ˈaɾ/" \
  "παγετώνας" "/pa.ʝe.ˈto.nas/"

put_word "thunder" "nature" "advanced" \
  "$U/photo-1429552077091-836152271555?w=300&h=300&fit=crop" \
  "$U/photo-1476610182048-b716b8518aae?w=300&h=300&fit=crop" \
  "$U/photo-1461511669078-d46bf351cd6e?w=300&h=300&fit=crop" \
  "thunder" "/ˈθʌn.dər/" \
  "trueno" "/ˈtɾwe.no/" \
  "tonnerre" "/tɔ.nɛʁ/" \
  "Donner" "/ˈdɔ.nɐ/" \
  "tuono" "/ˈtwo.no/" \
  "trovão" "/tɾu.ˈvɐ̃w̃/" \
  "βροντή" "/vron.ˈdi/"

put_word "earth" "nature" "advanced" \
  "$U/photo-1451187580459-43490279c0fa?w=300&h=300&fit=crop" \
  "$U/photo-1429552077091-836152271555?w=300&h=300&fit=crop" \
  "$U/photo-1476610182048-b716b8518aae?w=300&h=300&fit=crop" \
  "earth" "/ɜːrθ/" \
  "tierra" "/ˈtje.ra/" \
  "terre" "/tɛʁ/" \
  "Erde" "/ˈeːɐ̯.də/" \
  "terra" "/ˈtɛr.ra/" \
  "terra" "/ˈtɛ.ʁɐ/" \
  "γη" "/ʝi/"

put_word "coral_reef" "nature" "advanced" \
  "$U/photo-1546026423-cc4642628d2b?w=300&h=300&fit=crop" \
  "$U/photo-1451187580459-43490279c0fa?w=300&h=300&fit=crop" \
  "$U/photo-1505118380757-91f5f5632de0?w=300&h=300&fit=crop" \
  "coral reef" "/ˈkɒr.əl riːf/" \
  "arrecife de coral" "/a.re.ˈθi.fe ðe ko.ˈɾal/" \
  "récif corallien" "/ʁe.sif kɔ.ʁa.ljɛ̃/" \
  "Korallenriff" "/ko.ˈʁa.lən.ʁɪf/" \
  "barriera corallina" "/bar.ˈrjɛ.ra ko.ral.ˈli.na/" \
  "recife de coral" "/ʁe.ˈsi.fɨ dɨ ko.ˈɾaɫ/" \
  "κοραλλιογενής ύφαλος" "/ko.ra.li.o.ʝe.ˈnis ˈi.fa.los/"

put_word "volcano_2" "nature" "advanced" \
  "$U/photo-1562095241-8c6714fd4178?w=300&h=300&fit=crop" \
  "$U/photo-1546026423-cc4642628d2b?w=300&h=300&fit=crop" \
  "$U/photo-1429552077091-836152271555?w=300&h=300&fit=crop" \
  "eruption" "/ɪ.ˈrʌp.ʃən/" \
  "erupción" "/e.ɾup.ˈθjon/" \
  "éruption" "/e.ʁyp.sjɔ̃/" \
  "Eruption" "/e.ʁʊp.ˈtsi̯oːn/" \
  "eruzione" "/e.ru.ˈtsjo.ne/" \
  "erupção" "/e.ɾup.ˈsɐ̃w̃/" \
  "έκρηξη" "/ˈek.ri.ksi/"

put_word "desert_oasis" "nature" "advanced" \
  "$U/photo-1509316785289-025f5b846b36?w=300&h=300&fit=crop" \
  "$U/photo-1562095241-8c6714fd4178?w=300&h=300&fit=crop" \
  "$U/photo-1546026423-cc4642628d2b?w=300&h=300&fit=crop" \
  "oasis" "/oʊ.ˈeɪ.sɪs/" \
  "oasis" "/o.ˈa.sis/" \
  "oasis" "/ɔ.a.zis/" \
  "Oase" "/o.ˈaː.zə/" \
  "oasi" "/o.ˈa.zi/" \
  "oásis" "/o.ˈa.ziʃ/" \
  "όαση" "/ˈo.a.si/"

put_word "aurora" "nature" "advanced" \
  "$U/photo-1483347756197-71ef80e95f73?w=300&h=300&fit=crop" \
  "$U/photo-1509316785289-025f5b846b36?w=300&h=300&fit=crop" \
  "$U/photo-1562095241-8c6714fd4178?w=300&h=300&fit=crop" \
  "aurora" "/ɔː.ˈrɔːr.ə/" \
  "aurora" "/a.u.ˈɾo.ɾa/" \
  "aurore" "/o.ʁɔʁ/" \
  "Polarlicht" "/po.ˈlaːɐ̯.lɪçt/" \
  "aurora" "/a.u.ˈrɔ.ra/" \
  "aurora" "/aw.ˈɾo.ɾɐ/" \
  "σέλας" "/ˈse.las/"

put_word "horizon" "nature" "advanced" \
  "$U/photo-1470252649378-9c29740c9fa8?w=300&h=300&fit=crop" \
  "$U/photo-1483347756197-71ef80e95f73?w=300&h=300&fit=crop" \
  "$U/photo-1509316785289-025f5b846b36?w=300&h=300&fit=crop" \
  "horizon" "/hə.ˈraɪ.zən/" \
  "horizonte" "/o.ɾi.ˈθon.te/" \
  "horizon" "/ɔ.ʁi.zɔ̃/" \
  "Horizont" "/ho.ʁi.ˈtsɔnt/" \
  "orizzonte" "/o.rid.ˈdzon.te/" \
  "horizonte" "/o.ɾi.ˈzõ.tɨ/" \
  "ορίζοντας" "/o.ˈri.zon.das/"


# =============================================================================
# Summary
# =============================================================================
echo ""
echo "============================================"
echo "🎉 Language expansion seeding complete!"
echo "   Total words inserted: $COUNT"
echo "   Errors: $ERRORS"
echo "   Table: $TABLE_NAME"
echo "   Region: $REGION"
echo "============================================"
echo ""
echo "Breakdown by category:"
echo "  🐻 Animals:  24 words (8 beginner, 8 intermediate, 8 advanced)"
echo "  🍇 Food:     24 words (8 beginner, 8 intermediate, 8 advanced)"
echo "  🎨 Colors:   14 words (5 beginner, 5 intermediate, 4 advanced)"
echo "  🔢 Numbers:  16 words (6 beginner, 5 intermediate, 5 advanced)"
echo "  🪑 Objects:  24 words (8 beginner, 8 intermediate, 8 advanced)"
echo "  🌋 Nature:   24 words (8 beginner, 8 intermediate, 8 advanced)"
echo "  ─────────────────────────────────────────"
echo "  Total:       126 new words"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo "⚠️  $ERRORS errors occurred. Check AWS credentials and table name."
  exit 1
fi
