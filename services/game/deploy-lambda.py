#!/usr/bin/env python3
import boto3
import sys

def deploy_lambda():
    client = boto3.client('lambda', region_name='us-east-1')
    
    with open('function.zip', 'rb') as f:
        zip_data = f.read()
    
    print(f"📦 Deploying {len(zip_data)} bytes to Lambda...")
    
    try:
        response = client.update_function_code(
            FunctionName='MemoryGame-GameService-dev',
            ZipFile=zip_data
        )
        print("✅ Deployment successful!")
        print(f"Status: {response['LastUpdateStatus']}")
        print(f"Code Size: {response['CodeSize']} bytes")
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    deploy_lambda()
