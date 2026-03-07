#!/usr/bin/env python3
"""
Calculate Daily Active Users (DAU) for DashDen
Python version with more detailed analytics
"""

import boto3
from datetime import datetime, timezone
from collections import defaultdict
import json

# Configuration
REGION = 'us-east-1'
ENV = 'dev'
GAMES_TABLE = f'memory-game-games-{ENV}'
RATE_LIMITS_TABLE = f'memory-game-rate-limits-{ENV}'

# Initialize AWS clients
dynamodb = boto3.client('dynamodb', region_name=REGION)

def get_today_iso():
    """Get today's date in ISO format (YYYY-MM-DD)"""
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')

def calculate_dau_from_games(date_str):
    """
    Calculate DAU from Games table
    Most accurate - counts users who actually played games
    """
    print(f"\n{'='*60}")
    print(f"METHOD 1: Games Table Analysis")
    print(f"{'='*60}")
    
    unique_users = set()
    games_by_theme = defaultdict(int)
    games_by_user = defaultdict(int)
    total_games = 0
    
    # Scan games table for today
    paginator = dynamodb.get_paginator('scan')
    
    response_iterator = paginator.paginate(
        TableName=GAMES_TABLE,
        FilterExpression='begins_with(startedAt, :date)',
        ExpressionAttributeValues={
            ':date': {'S': date_str}
        },
        ProjectionExpression='userId,themeId,gameId'
    )
    
    for page in response_iterator:
        for item in page.get('Items', []):
            user_id = item['userId']['S']
            theme_id = item.get('themeId', {}).get('S', 'UNKNOWN')
            
            unique_users.add(user_id)
            games_by_theme[theme_id] += 1
            games_by_user[user_id] += 1
            total_games += 1
    
    dau = len(unique_users)
    avg_games_per_user = total_games / dau if dau > 0 else 0
    
    print(f"\n✅ Daily Active Users: {dau}")
    print(f"   Total games played: {total_games}")
    print(f"   Average games per user: {avg_games_per_user:.2f}")
    
    print(f"\n📊 Games by Theme:")
    for theme, count in sorted(games_by_theme.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_games * 100) if total_games > 0 else 0
        print(f"   - {theme}: {count} games ({percentage:.1f}%)")
    
    print(f"\n👥 User Engagement Distribution:")
    engagement_buckets = defaultdict(int)
    for user, count in games_by_user.items():
        if count == 1:
            engagement_buckets['1 game'] += 1
        elif count == 2:
            engagement_buckets['2 games'] += 1
        elif count == 3:
            engagement_buckets['3 games (free limit)'] += 1
        elif count <= 10:
            engagement_buckets['4-10 games'] += 1
        else:
            engagement_buckets['10+ games (power users)'] += 1
    
    for bucket, user_count in sorted(engagement_buckets.items()):
        percentage = (user_count / dau * 100) if dau > 0 else 0
        print(f"   - {bucket}: {user_count} users ({percentage:.1f}%)")
    
    return dau, unique_users

def calculate_dau_from_rate_limits(date_str):
    """
    Calculate DAU from Rate Limits table
    Faster - counts users who accessed the system
    """
    print(f"\n{'='*60}")
    print(f"METHOD 2: Rate Limits Table Analysis")
    print(f"{'='*60}")
    
    users_by_tier = defaultdict(set)
    usage_by_tier = defaultdict(list)
    
    # Scan rate limits table for today
    paginator = dynamodb.get_paginator('scan')
    
    response_iterator = paginator.paginate(
        TableName=RATE_LIMITS_TABLE,
        FilterExpression='begins_with(updatedAt, :date)',
        ExpressionAttributeValues={
            ':date': {'S': date_str}
        },
        ProjectionExpression='userId,tier,#count',
        ExpressionAttributeNames={
            '#count': 'count'
        }
    )
    
    for page in response_iterator:
        for item in page.get('Items', []):
            user_id = item['userId']['S']
            tier = item.get('tier', {}).get('S', 'FREE')
            count = int(item.get('count', {}).get('N', 0))
            
            users_by_tier[tier].add(user_id)
            usage_by_tier[tier].append(count)
    
    total_users = sum(len(users) for users in users_by_tier.values())
    
    print(f"\n✅ Daily Active Users: {total_users}")
    
    print(f"\n💎 Breakdown by Subscription Tier:")
    for tier in ['FREE', 'LIGHT', 'BASIC', 'STANDARD', 'PREMIUM']:
        if tier in users_by_tier:
            count = len(users_by_tier[tier])
            percentage = (count / total_users * 100) if total_users > 0 else 0
            avg_usage = sum(usage_by_tier[tier]) / len(usage_by_tier[tier]) if usage_by_tier[tier] else 0
            print(f"   - {tier}: {count} users ({percentage:.1f}%) - Avg {avg_usage:.1f} plays")
    
    # Calculate conversion opportunities
    free_users = len(users_by_tier.get('FREE', set()))
    free_at_limit = sum(1 for count in usage_by_tier.get('FREE', []) if count >= 3)
    
    print(f"\n💰 Conversion Opportunities:")
    print(f"   - Free users at daily limit: {free_at_limit}")
    if free_users > 0:
        print(f"   - Conversion opportunity rate: {(free_at_limit / free_users * 100):.1f}%")
    
    return total_users

def calculate_mau_estimate(dau, days_in_month=30):
    """
    Estimate Monthly Active Users (MAU)
    Rough estimate: MAU ≈ DAU × 20 (assuming 67% monthly retention)
    """
    print(f"\n{'='*60}")
    print(f"MAU ESTIMATION")
    print(f"{'='*60}")
    
    # Conservative estimate (50% retention)
    mau_conservative = dau * 15
    
    # Moderate estimate (67% retention)
    mau_moderate = dau * 20
    
    # Optimistic estimate (80% retention)
    mau_optimistic = dau * 24
    
    print(f"\n📈 Estimated Monthly Active Users (MAU):")
    print(f"   - Conservative (50% retention): {mau_conservative:,}")
    print(f"   - Moderate (67% retention): {mau_moderate:,}")
    print(f"   - Optimistic (80% retention): {mau_optimistic:,}")
    
    return mau_moderate

def main():
    """Main execution"""
    print("="*60)
    print("DashDen - Daily Active Users Calculator")
    print("="*60)
    
    today = get_today_iso()
    print(f"\n📅 Calculating DAU for: {today}")
    
    try:
        # Method 1: Games table (most accurate)
        dau_games, active_users = calculate_dau_from_games(today)
        
        # Method 2: Rate limits table (faster)
        dau_rate_limits = calculate_dau_from_rate_limits(today)
        
        # MAU estimation
        mau = calculate_mau_estimate(dau_games)
        
        # Final summary
        print(f"\n{'='*60}")
        print(f"FINAL SUMMARY")
        print(f"{'='*60}")
        print(f"\n📊 Key Metrics:")
        print(f"   - DAU (Daily Active Users): {dau_games}")
        print(f"   - Estimated MAU: {mau:,}")
        print(f"   - DAU/MAU Ratio: {(dau_games / mau * 100):.1f}% (stickiness)")
        
        print(f"\n✅ Calculation complete!")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
