#!/bin/bash
set -e

echo "📦 Creating backup before deployment..."

# Create backup directory with timestamp
BACKUP_DIR="../../backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup current Lambda code
echo "Downloading current Lambda code..."
aws lambda get-function --function-name MemoryGame-GameService-dev \
  --query 'Code.Location' --output text | \
  xargs curl -s -o "$BACKUP_DIR/lambda-backup.zip"

# Save Lambda configuration
echo "Saving Lambda configuration..."
aws lambda get-function-configuration --function-name MemoryGame-GameService-dev \
  > "$BACKUP_DIR/lambda-config.json"

# Save current git commit
echo "Saving git commit info..."
git log -1 --pretty=format:"%H%n%an%n%ae%n%ad%n%s" > "$BACKUP_DIR/git-commit.txt"

# Save package versions
echo "Saving package versions..."
cat package.json | jq '{name, version, dependencies}' > "$BACKUP_DIR/package-info.json"

# Calculate sizes
LAMBDA_SIZE=$(ls -lh "$BACKUP_DIR/lambda-backup.zip" | awk '{print $5}')

echo ""
echo "✅ Backup complete!"
echo "Location: $BACKUP_DIR"
echo "Lambda size: $LAMBDA_SIZE"
echo ""
echo "To restore this backup:"
echo "  aws lambda update-function-code \\"
echo "    --function-name MemoryGame-GameService-dev \\"
echo "    --zip-file \"fileb://$BACKUP_DIR/lambda-backup.zip\""
echo ""
