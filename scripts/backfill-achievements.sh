#!/usr/bin/env bash
#
# Backfill achievements for all users in DashDen
# Reads completed games from memory-game-games-prod and writes
# achievement records to memory-game-achievements-prod with correct dates.
#
# Uses --profile dashden-new for all AWS commands (prod account 342278407349)
#

set -euo pipefail

PROFILE="dashden-new"
REGION="us-east-1"
GAMES_TABLE="memory-game-games-prod"
ACHIEVEMENTS_TABLE="memory-game-achievements-prod"
TMPDIR_SCRIPT=$(mktemp -d)
GAMES_FILE="$TMPDIR_SCRIPT/games.json"
ACHIEVEMENTS_FILE="$TMPDIR_SCRIPT/achievements.json"
PYTHON_SCRIPT="$TMPDIR_SCRIPT/compute.py"

trap "rm -rf $TMPDIR_SCRIPT" EXIT

echo "============================================"
echo "  DashDen Achievement Backfill Script"
echo "============================================"
echo ""
echo "Profile:      $PROFILE"
echo "Region:       $REGION"
echo "Games table:  $GAMES_TABLE"
echo "Achievements: $ACHIEVEMENTS_TABLE"
echo ""

# Step 1: Fetch ALL completed games
echo "[1/4] Fetching all completed games..."

aws dynamodb scan \
  --table-name "$GAMES_TABLE" \
  --profile "$PROFILE" \
  --region "$REGION" \
  --filter-expression "#s = :completed" \
  --expression-attribute-names '{"#s":"status"}' \
  --expression-attribute-values '{":completed":{"S":"COMPLETED"}}' \
  --output json > "$GAMES_FILE"

GAME_COUNT=$(python3 -c "import json; print(json.load(open('$GAMES_FILE'))['Count'])")
echo "   Found $GAME_COUNT completed games"

# Step 2: Compute achievements per user using Python
echo ""
echo "[2/4] Computing achievements for each user..."

cat > "$PYTHON_SCRIPT" << 'PYEOF'
import json, sys
from collections import defaultdict

games_file = sys.argv[1]
output_file = sys.argv[2]

with open(games_file) as f:
    data = json.load(f)

items = data['Items']

# Group games by user
users = defaultdict(list)
for item in items:
    users[item['userId']['S']].append({
        'gameId': item['gameId']['S'],
        'themeId': item['themeId']['S'],
        'score': int(item['score']['N']),
        'difficulty': int(item['difficulty']['N']),
        'attempts': int(item['attempts']['N']),
        'completionTime': int(item['completionTime']['N']),
        'completedAt': item['completedAt']['S'],
    })

# Sort each user's games by completedAt
for uid in users:
    users[uid].sort(key=lambda g: g['completedAt'])

# Min attempts per difficulty for PERFECT_MEMORY
MIN_ATTEMPTS = {1: 6, 2: 12, 3: 18, 4: 24, 5: 30}

all_achievements = []

for uid, games in users.items():
    n = len(games)

    # --- FIRST_WIN ---
    if n >= 1:
        all_achievements.append({
            'userId': uid,
            'achievementType': 'FIRST_WIN',
            'completed': True,
            'progress': 1,
            'completedAt': games[0]['completedAt'],
        })

    # --- TEN_GAMES ---
    if n >= 10:
        all_achievements.append({
            'userId': uid,
            'achievementType': 'TEN_GAMES',
            'completed': True,
            'progress': 10,
            'completedAt': games[9]['completedAt'],
        })
    elif n > 0:
        all_achievements.append({
            'userId': uid,
            'achievementType': 'TEN_GAMES',
            'completed': False,
            'progress': n,
            'completedAt': None,
        })

    # --- FIFTY_GAMES ---
    if n >= 50:
        all_achievements.append({
            'userId': uid,
            'achievementType': 'FIFTY_GAMES',
            'completed': True,
            'progress': 50,
            'completedAt': games[49]['completedAt'],
        })
    elif n > 0:
        all_achievements.append({
            'userId': uid,
            'achievementType': 'FIFTY_GAMES',
            'completed': False,
            'progress': n,
            'completedAt': None,
        })

    # --- HUNDRED_GAMES ---
    if n >= 100:
        all_achievements.append({
            'userId': uid,
            'achievementType': 'HUNDRED_GAMES',
            'completed': True,
            'progress': 100,
            'completedAt': games[99]['completedAt'],
        })
    elif n > 0:
        all_achievements.append({
            'userId': uid,
            'achievementType': 'HUNDRED_GAMES',
            'completed': False,
            'progress': n,
            'completedAt': None,
        })

    # --- SPEED_DEMON --- (completion time < 30 seconds)
    for g in games:
        if g['completionTime'] < 30:
            all_achievements.append({
                'userId': uid,
                'achievementType': 'SPEED_DEMON',
                'completed': True,
                'progress': 1,
                'completedAt': g['completedAt'],
            })
            break

    # --- PERFECT_MEMORY --- (attempts == min for difficulty)
    for g in games:
        min_att = MIN_ATTEMPTS.get(g['difficulty'], 12)
        if g['attempts'] == min_att:
            all_achievements.append({
                'userId': uid,
                'achievementType': 'PERFECT_MEMORY',
                'completed': True,
                'progress': 1,
                'completedAt': g['completedAt'],
            })
            break

    # --- THEME_MASTER --- (10+ different themes)
    themes_seen = set()
    theme_date = None
    for g in games:
        themes_seen.add(g['themeId'])
        if len(themes_seen) >= 10 and theme_date is None:
            theme_date = g['completedAt']
    if len(themes_seen) >= 10:
        all_achievements.append({
            'userId': uid,
            'achievementType': 'THEME_MASTER',
            'completed': True,
            'progress': len(themes_seen),
            'completedAt': theme_date,
        })
    elif len(themes_seen) > 0:
        all_achievements.append({
            'userId': uid,
            'achievementType': 'THEME_MASTER',
            'completed': False,
            'progress': len(themes_seen),
            'completedAt': None,
        })

    # --- DIFFICULTY_CHAMPION --- (all 5 difficulty levels)
    diffs_seen = set()
    diff_date = None
    for g in games:
        diffs_seen.add(g['difficulty'])
        if len(diffs_seen) >= 5 and diff_date is None:
            diff_date = g['completedAt']
    if len(diffs_seen) >= 5:
        all_achievements.append({
            'userId': uid,
            'achievementType': 'DIFFICULTY_CHAMPION',
            'completed': True,
            'progress': 5,
            'completedAt': diff_date,
        })
    elif len(diffs_seen) > 0:
        all_achievements.append({
            'userId': uid,
            'achievementType': 'DIFFICULTY_CHAMPION',
            'completed': False,
            'progress': len(diffs_seen),
            'completedAt': None,
        })

# Print summary
from collections import defaultdict as dd
by_user = dd(list)
for a in all_achievements:
    by_user[a['userId']].append(a)

for uid in sorted(by_user.keys()):
    achievements = by_user[uid]
    completed = [a for a in achievements if a['completed']]
    in_progress = [a for a in achievements if not a['completed']]
    print(f"\n  User: {uid[:8]}...")
    if completed:
        print(f"    Completed ({len(completed)}):")
        for a in completed:
            dt = a['completedAt'][:10] if a['completedAt'] else 'N/A'
            print(f"       + {a['achievementType']} (date: {dt})")
    if in_progress:
        print(f"    In Progress ({len(in_progress)}):")
        for a in in_progress:
            print(f"       ~ {a['achievementType']} (progress: {a['progress']})")

total = len(all_achievements)
completed_total = sum(1 for a in all_achievements if a['completed'])
print(f"\n   Total: {total} records ({completed_total} completed, {total - completed_total} in-progress)")

with open(output_file, 'w') as f:
    json.dump(all_achievements, f)
PYEOF

python3 "$PYTHON_SCRIPT" "$GAMES_FILE" "$ACHIEVEMENTS_FILE"

# Step 3: Write to DynamoDB
echo ""
echo "[3/4] Writing achievements to $ACHIEVEMENTS_TABLE..."

NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Use Python to generate put-item commands and execute them
cat > "$TMPDIR_SCRIPT/write.py" << WRITEEOF
import json, subprocess, sys

achievements_file = sys.argv[1]
table = sys.argv[2]
profile = sys.argv[3]
region = sys.argv[4]
now = sys.argv[5]

with open(achievements_file) as f:
    achievements = json.load(f)

success = 0
fail = 0

for a in achievements:
    uid = a['userId']
    ach_type = a['achievementType']
    completed = a['completed']
    progress = a['progress']
    completed_at = a['completedAt']

    item = {
        "userId": {"S": uid},
        "achievementType": {"S": ach_type},
        "id": {"S": f"{uid}#{ach_type}"},
        "completed": {"BOOL": completed},
        "progress": {"N": str(progress)},
        "createdAt": {"S": completed_at if completed_at else now},
        "updatedAt": {"S": now},
    }

    if completed and completed_at:
        item["completedAt"] = {"S": completed_at}

    item_json = json.dumps(item)

    try:
        result = subprocess.run(
            [
                "aws", "dynamodb", "put-item",
                "--table-name", table,
                "--profile", profile,
                "--region", region,
                "--item", item_json,
            ],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            success += 1
            status = "OK"
        else:
            fail += 1
            status = f"FAIL: {result.stderr.strip()[:80]}"
    except Exception as e:
        fail += 1
        status = f"ERROR: {str(e)[:80]}"

    comp_label = f"completed {completed_at[:10]}" if completed else f"in-progress ({progress})"
    icon = "+" if result.returncode == 0 else "X"
    print(f"   [{icon}] {uid[:8]}... {ach_type} ({comp_label})")

print(f"\n   Results: {success} succeeded, {fail} failed")
WRITEEOF

python3 "$TMPDIR_SCRIPT/write.py" "$ACHIEVEMENTS_FILE" "$ACHIEVEMENTS_TABLE" "$PROFILE" "$REGION" "$NOW"

# Step 4: Verify
echo ""
echo "[4/4] Verifying achievements table..."

VERIFY_FILE="$TMPDIR_SCRIPT/verify.json"
aws dynamodb scan \
    --table-name "$ACHIEVEMENTS_TABLE" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --select COUNT > "$VERIFY_FILE"
FINAL_COUNT=$(python3 -c "import json; print(json.load(open('$VERIFY_FILE'))['Count'])")
echo "   Total records in $ACHIEVEMENTS_TABLE: $FINAL_COUNT"

echo ""
echo "============================================"
echo "  Backfill complete!"
echo "============================================"
