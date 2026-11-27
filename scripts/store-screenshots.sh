#!/bin/zsh
# Takes App Store screenshots on a simulator by running integration_test/store_screenshots_test.dart.
#
#   SHOT_EMAIL=... SHOT_PASSWORD=... SHOT_CHALLENGE_PATH=/math-maze/play?challenge=2026-11-26 \
#     ./scripts/store-screenshots.sh <simulator-udid> <output-dir>
#
# Every SHOT_READY marker the test prints becomes <output-dir>/<name>.png (native resolution, status bar
# set to 9:41, full battery). Uses real plays on the given account, so use a throwaway account.
set -u
UDID=$1
OUT=$2
mkdir -p "$OUT"
ROOT=$(cd "$(dirname "$0")/.." && pwd)
LOG=$(mktemp)

xcrun simctl boot "$UDID" 2>/dev/null
xcrun simctl bootstatus "$UDID" -b > /dev/null
xcrun simctl status_bar "$UDID" override --time 9:41 --batteryState charged --batteryLevel 100 \
  --cellularMode active --cellularBars 4 --wifiBars 3 --dataNetwork wifi

cd "$ROOT/apps/mobile"
flutter test integration_test/store_screenshots_test.dart -d "$UDID" \
  --dart-define=SHOT_EMAIL="$SHOT_EMAIL" --dart-define=SHOT_PASSWORD="$SHOT_PASSWORD" \
  --dart-define=SHOT_CHALLENGE_PATH="${SHOT_CHALLENGE_PATH:-}" < /dev/null > "$LOG" 2>&1 &
PID=$!

taken=()
while kill -0 $PID 2>/dev/null; do
  for name in $(grep -o 'SHOT_READY [0-9a-z-]*' "$LOG" | awk '{print $2}'); do
    if (( ! ${taken[(Ie)$name]} )); then
      sleep 1
      xcrun simctl io "$UDID" screenshot --type=png "$OUT/$name.png" > /dev/null 2>&1 && echo "  ✓ $name"
      taken+=("$name")
    fi
  done
  sleep 1
done
wait $PID
STATUS=$?
grep -q SHOTS_DONE "$LOG" || { echo "Test did not finish (exit $STATUS). Log: $LOG"; tail -30 "$LOG"; exit 1; }
xcrun simctl status_bar "$UDID" clear
echo "Done: ${#taken} screenshots in $OUT"
rm -f "$LOG"
