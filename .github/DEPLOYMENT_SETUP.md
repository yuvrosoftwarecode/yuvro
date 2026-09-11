# GitHub Actions Deployment Setup

This document explains how to set up GitHub Actions for automated deployments to the dev environment.

## Prerequisites

You need:
1. An AWS IAM user with deployment permissions
2. An EC2 SSH private key for the deploy user

## Recommended Approach: Create Dedicated Deployment IAM User

### Step 1: Create IAM User for Deployments

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Add users**
3. Username: `yuvro-deployer`
4. Select **Access key - Programmatic access**
5. Click **Next: Permissions**

### Step 2: Attach Managed Policies

Attach these managed policies:
- `AmazonEC2FullAccess` (or create a more restrictive policy)
- `AmazonRDSFullAccess`
- `AmazonS3FullAccess` (for the app data bucket)
- `AWSTemporaryCredential` (for OpenTofu state locking)

### Step 3: Create Inline Policy (Recommended - More Secure)

Instead of full access, create an inline policy with minimal permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "OpenTofuState",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::yuvro-dev/*"
        },
        {
            "Sid": "EC2AMIRead",
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeImages"
            ],
            "Resource": "*"
        },
        {
            "Sid": "EC2Instances",
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeInstanceStatus",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeVolumes"
            ],
            "Resource": "*"
        },
        {
            "Sid": "EC2InstanceActions",
            "Effect": "Allow",
            "Action": [
                "ec2:StartInstances",
                "ec2:StopInstances",
                "ec2:TerminateInstances"
            ],
            "Resource": "arn:aws:ec2:ap-south-1:878235034597:instance/*"
        },
        {
            "Sid": "RDS",
            "Effect": "Allow",
            "Action": [
                "rds:DescribeDBInstances"
            ],
            "Resource": "*"
        },
        {
            "Sid": "SSM",
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters"
            ],
            "Resource": "arn:aws:ssm:ap-south-1:878235034597:parameter/yuvro/*"
        }
    ]
}
```

### Step 4: Create Access Key

1. In the user summary, go to **Security credentials**
2. Click **Create access key**
3. Select **Other** and choose **Command Line Interface (CLI)**
4. Copy the **Access key ID** and **Secret access key**

### Step 5: Add Secrets to GitHub

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `DEPLOY_AWS_ACCESS_KEY_ID` | Your IAM access key ID | For AWS programmatic access |
| `DEPLOY_AWS_SECRET_ACCESS_KEY` | Your IAM secret access key | For AWS programmatic access |
| `DEPLOY_EC2_SSH_PRIVATE_KEY` | Contents of `~/.ssh/yuvro-dev.pem` | SSH key for EC2 deployment |

### Step 6: Test the Workflow

1. Go to **Actions** tab in GitHub
2. Click **Deploy to Dev** workflow
3. Click **Run workflow**
4. Select the branch and app to deploy
5. Click **Run workflow**

## Alternative: Use Existing Credentials (Not Recommended)

If you already have AWS credentials, you can reuse them, but:

1. **Create a read-only user for CI** - Use different credentials for running tests vs deployments
2. **Rotate credentials** - Set a 90-day rotation schedule
3. **Use environment-specific keys** - Different keys for dev/staging/prod

## Security Best Practices

1. **Never commit secrets** - Always use GitHub Secrets
2. **Use least privilege** - Grant only necessary permissions
3. **Enable MFA** - For the deploy IAM user
4. **Audit access** - Regularly review IAM policies
5. **Rotate keys** - Every 90 days
6. **Use SSM Parameter Store** - For sensitive values instead of env vars

## Troubleshooting

### "No valid credentials" error
- Check that secrets are configured correctly
- Verify the IAM user has the correct policies attached

### SSH connection refused
- Verify the EC2 instance is running
- Check that the security group allows SSH (port 22) from GitHub Actions IPs
- Ensure the SSH key has the correct permissions (400)

### OpenTofu state lock error
- Verify the S3 bucket exists
- Check DynamoDB table permissions (for state locking)


# Deployment IAM Roles and Permissions

This document outlines the recommended IAM policies for deployment.

## Recommended IAM Policy for Deployment

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "OpenTofuStateManagement",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::yuvro-dev",
                "arn:aws:s3:::yuvro-dev/*"
            ]
        },
        {
            "Sid": "DynamoDBStateLocking",
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": "arn:aws:dynamodb:ap-south-1:878235034597:table/yuvro-tofu-state"
        },
        {
            "Sid": "EC2InstanceManagement",
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeInstanceStatus",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeVolumes"
            ],
            "Resource": "*"
        },
        {
            "Sid": "EC2InstanceActions",
            "Effect": "Allow",
            "Action": [
                "ec2:StartInstances",
                "ec2:StopInstances",
                "ec2:TerminateInstances"
            ],
            "Resource": "arn:aws:ec2:ap-south-1:878235034597:instance/*"
        },
        {
            "Sid": "RDSManagement",
            "Effect": "Allow",
            "Action": [
                "rds:DescribeDBInstances",
                "rds:CreateDBInstance",
                "rds:DeleteDBInstance",
                "rds:ModifyDBInstance"
            ],
            "Resource": "arn:aws:rds:ap-south-1:878235034597:db:*"
        },
        {
            "Sid": "CloudWatchLogs",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams"
            ],
            "Resource": "arn:aws:logs:ap-south-1:878235034597:log-group:*"
        },
        {
            "Sid": "SSMParameterStore",
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters",
                "ssm:PutParameter"
            ],
            "Resource": "arn:aws:ssm:ap-south-1:878235034597:parameter/yuvro/*"
        },
        {
            "Sid": "KMSDecryption",
            "Effect": "Allow",
            "Action": [
                "kms:Decrypt"
            ],
            "Resource": "arn:aws:kms:ap-south-1:878235034597:key/*"
        }
    ]
}
```

## Recommended EC2 Permissions Policy

For the EC2 instance profile (if using an instance role):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "EC2Metadata",
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances"
            ],
            "Resource": "*"
        },
        {
            "Sid": "EC2Actions",
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeVolumes",
                "ec2:ModifyVolume"
            ],
            "Resource": "*"
        },
        {
            "Sid": "SSM",
            "Effect": "Allow",
            "Action": [
                "ssm:DescribeInstanceInformation",
                "ssm:GetParameters"
            ],
            "Resource": "*"
        }
    ]
}
```

## Security Groups

Ensure the EC2 security group allows:
- **SSH (22)** from GitHub Actions IPs (or use a bastion host)
- **HTTPS (443)** from 0.0.0.0/0
- **Docker API (2375)** locally only
