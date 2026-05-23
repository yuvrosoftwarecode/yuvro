#!/bin/bash
set -e

echo "Initializing LocalStack AWS services..."

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
for i in {1..30}; do
  if awslocal s3 ls > /dev/null 2>&1; then
    echo "LocalStack is ready!"
    break
  fi
  echo "Attempt $i/30: Waiting for LocalStack..."
  sleep 2
done

# Create S3 buckets
echo "Creating S3 buckets..."
awslocal s3 mb s3://local-ycode-app-data || true
awslocal s3 mb s3://local-ycampus-app-data || true
awslocal s3 mb s3://local-ycode-logs || true
awslocal s3 mb s3://local-ycampus-logs || true

# Enable versioning on S3 buckets
echo "Enabling versioning on S3 buckets..."
awslocal s3api put-bucket-versioning \
  --bucket local-ycode-app-data \
  --versioning-configuration Status=Enabled || true
awslocal s3api put-bucket-versioning \
  --bucket local-ycampus-app-data \
  --versioning-configuration Status=Enabled || true

# Create RDS databases
echo "Creating RDS databases..."
awslocal rds create-db-instance \
  --db-instance-identifier local-ycode-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username ycode_user \
  --master-user-password ycode_password \
  --allocated-storage 20 \
  --db-name ycode \
  --no-publicly-accessible \
  --storage-encrypted || true

awslocal rds create-db-instance \
  --db-instance-identifier local-ycampus-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username ycampus_user \
  --master-user-password ycampus_password \
  --allocated-storage 20 \
  --db-name ycampus \
  --no-publicly-accessible \
  --storage-encrypted || true

# Create IAM roles
echo "Creating IAM roles..."
awslocal iam create-role \
  --role-name local-app-service-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ec2.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' || true

awslocal iam create-role \
  --role-name local-kubernetes-node-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ec2.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' || true

# Create IAM policies
echo "Creating IAM policies..."
awslocal iam put-role-policy \
  --role-name local-app-service-role \
  --policy-name s3-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::local-ycode-app-data",
          "arn:aws:s3:::local-ycode-app-data/*",
          "arn:aws:s3:::local-ycampus-app-data",
          "arn:aws:s3:::local-ycampus-app-data/*"
        ]
      }
    ]
  }' || true

# Create CloudWatch log groups
echo "Creating CloudWatch log groups..."
awslocal logs create-log-group --log-group-name /aws/ycode/local/application || true
awslocal logs create-log-group --log-group-name /aws/ycode/local/kubernetes || true
awslocal logs create-log-group --log-group-name /aws/ycode/local/database || true

# Create SQS queues
echo "Creating SQS queues..."
awslocal sqs create-queue --queue-name local-ycode-tasks || true
awslocal sqs create-queue --queue-name local-ycampus-tasks || true

# Create SNS topics
echo "Creating SNS topics..."
awslocal sns create-topic --name local-ycode-notifications || true
awslocal sns create-topic --name local-ycampus-notifications || true

echo "LocalStack initialization completed!"
