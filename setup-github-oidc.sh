#!/bin/bash
# Setup GitHub Actions OIDC role for AWS ECR access

set -e

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="ap-south-1"
ROLE_NAME="github-actions-role"

echo "=========================================="
echo "GitHub Actions OIDC Setup"
echo "=========================================="
echo "Account ID: $ACCOUNT_ID"
echo "Region: $REGION"
echo ""

# Step 1: Create OIDC Provider
echo "Step 1: Creating GitHub OIDC Provider..."

OIDC_PROVIDER=$(aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[?contains(OpenIDConnectProviderArn, 'token.actions.githubusercontent.com')].OpenIDConnectProviderArn" \
  --output text)

if [ -z "$OIDC_PROVIDER" ]; then
  echo "Creating new OIDC provider..."
  
  # Get thumbprint
  THUMBPRINT=$(echo | openssl s_client -connect token.actions.githubusercontent.com:443 2>/dev/null \
    | openssl x509 -fingerprint -noout | sed 's/://g' | awk '{print $NF}')
  
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list $THUMBPRINT
  
  echo "✅ OIDC provider created"
else
  echo "✅ OIDC provider already exists: $OIDC_PROVIDER"
fi

# Step 2: Create IAM Role
echo ""
echo "Step 2: Creating GitHub Actions IAM Role..."

ROLE_EXISTS=$(aws iam get-role --role-name $ROLE_NAME 2>/dev/null || echo "")

if [ -z "$ROLE_EXISTS" ]; then
  echo "Creating new IAM role..."
  
  TRUST_POLICY='{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::'"$ACCOUNT_ID"':oidc-provider/token.actions.githubusercontent.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
          },
          "StringLike": {
            "token.actions.githubusercontent.com:sub": "repo:*"
          }
        }
      }
    ]
  }'
  
  aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document "$TRUST_POLICY"
  
  echo "✅ IAM role created: $ROLE_NAME"
else
  echo "✅ IAM role already exists: $ROLE_NAME"
fi

# Step 3: Attach ECR Policy
echo ""
echo "Step 3: Attaching ECR permissions..."

ECR_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:'"$REGION"':'"$ACCOUNT_ID"':repository/*"
    }
  ]
}'

aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name github-actions-ecr-policy \
  --policy-document "$ECR_POLICY"

echo "✅ ECR policy attached"

# Step 4: Verify setup
echo ""
echo "Step 4: Verifying setup..."

ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query "Role.Arn" --output text)
echo "✅ Role ARN: $ROLE_ARN"

POLICIES=$(aws iam list-role-policies --role-name $ROLE_NAME --query "PolicyNames" --output text)
echo "✅ Attached policies: $POLICIES"

# Step 5: Output GitHub Secrets
echo ""
echo "=========================================="
echo "GitHub Repository Setup"
echo "=========================================="
echo ""
echo "Add the following secret to GitHub:"
echo ""
echo "📝 Secret Name: AWS_ACCOUNT_ID"
echo "📝 Secret Value: $ACCOUNT_ID"
echo ""
echo "Steps:"
echo "1. Go to: https://github.com/<org>/<repo>/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Add the above secret"
echo ""
echo "=========================================="
echo "✅ GitHub Actions OIDC Setup Complete!"
echo "=========================================="
echo ""
echo "You can now use the following workflows:"
echo "  - Release and Build Images (release-images.yml)"
echo "  - Deploy to Production (deploy-prod.yml)"
echo ""
echo "Next steps:"
echo "1. Push these changes to your main branch"
echo "2. Go to GitHub Actions and trigger 'Release and Build Images'"
echo "3. Provide version (e.g., v1.0.0)"
echo "4. Wait for images to build and push to ECR"
echo "5. Trigger 'Deploy to Production' with the same version"
