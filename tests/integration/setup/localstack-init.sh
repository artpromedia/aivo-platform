#!/bin/bash
# LocalStack Initialization Script
#
# Creates AWS resources needed for integration testing.
# This script runs when LocalStack is ready.

set -e

echo "Initializing LocalStack resources..."

# Configure AWS CLI for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:4566

# Create S3 buckets
echo "Creating S3 buckets..."
awslocal s3 mb s3://aivo-test-content
awslocal s3 mb s3://aivo-test-exports
awslocal s3 mb s3://aivo-test-uploads
awslocal s3 mb s3://aivo-test-backups

# Enable CORS on buckets
awslocal s3api put-bucket-cors --bucket aivo-test-uploads --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'

# Create SNS topics
echo "Creating SNS topics..."
awslocal sns create-topic --name aivo-test-notifications
awslocal sns create-topic --name aivo-test-events
awslocal sns create-topic --name aivo-test-alerts

# Create SQS queues
echo "Creating SQS queues..."
awslocal sqs create-queue --queue-name aivo-test-events-queue
awslocal sqs create-queue --queue-name aivo-test-notifications-queue
awslocal sqs create-queue --queue-name aivo-test-dlq

# Create SES email identity (for email testing)
echo "Setting up SES..."
awslocal ses verify-email-identity --email-address test@aivo.local

# Subscribe SQS to SNS
EVENTS_QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url http://localhost:4566/000000000000/aivo-test-events-queue --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
awslocal sns subscribe --topic-arn arn:aws:sns:us-east-1:000000000000:aivo-test-events --protocol sqs --notification-endpoint "$EVENTS_QUEUE_ARN"

echo "LocalStack initialization complete!"

# List created resources
echo ""
echo "Created resources:"
echo "=================="
echo "S3 Buckets:"
awslocal s3 ls
echo ""
echo "SNS Topics:"
awslocal sns list-topics --query 'Topics[].TopicArn' --output table
echo ""
echo "SQS Queues:"
awslocal sqs list-queues --query 'QueueUrls' --output table
