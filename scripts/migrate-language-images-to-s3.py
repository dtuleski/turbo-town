#!/usr/bin/env python3
"""
Migrate language learning images from external URLs to S3.
Downloads all images from Unsplash/external URLs and uploads to
dashden-assets-prod/language-images/, then updates DynamoDB records.
"""

import boto3
import requests
import hashlib
import json
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

# Config
BUCKET = 'dashden-assets-prod'
PREFIX = 'language-images'
TABLE = 'memory-game-language-words-prod'
REGION = 'us-east-1'
S3_BASE_URL = f'https://{BUCKET}.s3.{REGION}.amazonaws.com/{PREFIX}'

# AWS clients
session = boto3.Session(profile_name='dashden-new', region_name=REGION)
s3 = session.client('s3')
ddb = session.resource('dynamodb')
table = ddb.Table(TABLE)

def url_to_s3_key(url):
    """Generate a stable S3 key from a URL using its hash."""
    url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
    # Extract a meaningful name from URL
    parts = url.split('/')
    # For unsplash: photo-XXXXX
    name_part = next((p for p in reversed(parts) if p.startswith('photo-')), None)
    if name_part:
        name_part = name_part.split('?')[0]  # Remove query params
    else:
        name_part = url_hash
    return f'{PREFIX}/{url_hash}_{name_part}.jpg'

def download_and_upload(url):
    """Download image from URL and upload to S3. Returns (url, s3_url) or (url, None) on failure."""
    if not url or 'placehold.co' in url:
        # Skip placeholders - generate a simple colored placeholder in S3 instead
        return (url, None)
    
    s3_key = url_to_s3_key(url)
    s3_url = f'{S3_BASE_URL}/{s3_key.replace(PREFIX + "/", "")}'
    
    # Check if already uploaded
    try:
        s3.head_object(Bucket=BUCKET, Key=s3_key)
        return (url, s3_url)  # Already exists
    except:
        pass
    
    # Download
    try:
        resp = requests.get(url, timeout=30, headers={
            'User-Agent': 'DashDen-ImageMigration/1.0'
        })
        if resp.status_code != 200:
            print(f'  FAIL download ({resp.status_code}): {url[:60]}')
            return (url, None)
        
        content_type = resp.headers.get('content-type', 'image/jpeg')
        if 'svg' in content_type:
            content_type = 'image/svg+xml'
        elif 'png' in content_type:
            content_type = 'image/png'
        else:
            content_type = 'image/jpeg'
        
        # Upload to S3
        s3.put_object(
            Bucket=BUCKET,
            Key=s3_key,
            Body=resp.content,
            ContentType=content_type,
            CacheControl='public, max-age=31536000',  # 1 year cache
        )
        return (url, s3_url)
    except Exception as e:
        print(f'  ERROR: {url[:60]} -> {str(e)[:50]}')
        return (url, None)

def main():
    print('=== Language Image Migration to S3 ===')
    print(f'Bucket: {BUCKET}')
    print(f'Table: {TABLE}')
    print()
    
    # Step 1: Scan all items
    print('[1/4] Scanning DynamoDB for all language words...')
    items = []
    response = table.scan()
    items.extend(response['Items'])
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])
    print(f'  Found {len(items)} words')
    
    # Step 2: Collect all unique URLs
    print('[2/4] Collecting unique image URLs...')
    all_urls = set()
    for item in items:
        url = item.get('imageUrl', '')
        if url:
            all_urls.add(url)
        for d in item.get('distractorImages', []):
            if d:
                all_urls.add(d)
    
    # Filter out placeholders
    urls_to_migrate = [u for u in all_urls if 'placehold.co' not in u]
    print(f'  {len(urls_to_migrate)} unique URLs to migrate (excluding {len(all_urls) - len(urls_to_migrate)} placeholders)')
    
    # Step 3: Download and upload in parallel
    print('[3/4] Downloading and uploading to S3...')
    url_map = {}  # old_url -> new_s3_url
    failed = 0
    success = 0
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(download_and_upload, url): url for url in urls_to_migrate}
        for i, future in enumerate(as_completed(futures)):
            old_url, new_url = future.result()
            if new_url:
                url_map[old_url] = new_url
                success += 1
            else:
                failed += 1
            if (i + 1) % 50 == 0:
                print(f'  Progress: {i+1}/{len(urls_to_migrate)} (success={success}, failed={failed})')
    
    print(f'  Done: {success} uploaded, {failed} failed')
    
    # Step 4: Update DynamoDB records
    print('[4/4] Updating DynamoDB records...')
    updated = 0
    skipped = 0
    
    for item in items:
        word_id = item['wordId']
        changed = False
        
        # Update imageUrl
        old_img = item.get('imageUrl', '')
        if old_img in url_map:
            item['imageUrl'] = url_map[old_img]
            changed = True
        
        # Update distractorImages
        new_distractors = []
        for d in item.get('distractorImages', []):
            if d in url_map:
                new_distractors.append(url_map[d])
                changed = True
            else:
                new_distractors.append(d)
        
        if changed:
            table.update_item(
                Key={'wordId': word_id},
                UpdateExpression='SET imageUrl = :img, distractorImages = :dist',
                ExpressionAttributeValues={
                    ':img': item['imageUrl'],
                    ':dist': new_distractors,
                }
            )
            updated += 1
        else:
            skipped += 1
    
    print(f'  Updated: {updated} records, Skipped: {skipped}')
    print()
    print('=== Migration Complete ===')
    print(f'S3 base URL: {S3_BASE_URL}')
    print(f'Images uploaded: {success}')
    print(f'DynamoDB records updated: {updated}')

if __name__ == '__main__':
    main()
