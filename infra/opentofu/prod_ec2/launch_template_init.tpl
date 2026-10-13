#!/bin/bash
set -e

# Yuvro Production EC2 Docker Host Initialization Script
# Uses ECS-optimized Amazon Linux 2023 AMI (Docker pre-installed)
# Only configures application-specific settings

GITHUB_TOKEN="${github_token}"
DB_HOST="${db_host}"
DB_PORT="${db_port}"
DB_USERNAME="${db_username}"
DB_PASSWORD="${db_password}"
S3_BUCKET="${s3_bucket}"
DEPLOY_ENV="prod"
DEPLOY_INFRA_TYPE="ec2"

# Fallback to environment variable if not passed
if [ -z "$GITHUB_TOKEN" ]; then
  GITHUB_TOKEN="$${GITHUB_TOKEN_ENV:-}"
fi

# Logging
exec > >(tee /var/log/yuvro-init.log)
exec 2>&1

echo "=== Yuvro Production EC2 Initialization ==="
echo "Time: $(date)"
echo "Hostname: $(hostname)"
echo "Docker already installed by ECS-optimized AMI"

# ===== Setup GitHub Docker Registry Auth =====
echo "=== Setting up GitHub GHCR access ==="
mkdir -p /home/ec2-user/.docker
if [ ! -z "$GITHUB_TOKEN" ]; then
  cat > /home/ec2-user/.docker/config.json << EOF
{
  "auths": {
    "ghcr.io": {
      "auth": "$(echo -n "USERNAME:$GITHUB_TOKEN" | base64)"
    }
  }
}
EOF
  chown -R ec2-user:ec2-user /home/ec2-user/.docker
  chmod 600 /home/ec2-user/.docker/config.json
  echo "✓ GHCR authentication configured"
else
  echo "⚠️  Skipping GHCR auth - GITHUB_TOKEN not set"
fi

# ===== Create deployment directory =====
echo "=== Creating deployment directories ==="
mkdir -p /opt/yuvro
mkdir -p /var/log/yuvro
mkdir -p /data/yuvro/{uploads,backups}
chown -R ec2-user:ec2-user /opt/yuvro /var/log/yuvro /data/yuvro

# ===== Install Docker Compose (only non-Docker requirement) =====
echo "=== Installing Docker Compose ==="
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
curl -L "https://github.com/docker/compose/releases/download/$${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
echo "✓ Docker Compose installed: $(docker-compose --version)"

# ===== Setup environment variables =====
echo "=== Setting up environment variables ==="
cat > /opt/yuvro/.env << EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_HOST:$DB_PORT/ycode_db
POSTGRES_HOST=$DB_HOST
POSTGRES_PORT=$DB_PORT
POSTGRES_USER=$DB_USERNAME
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=ycode_db

# AWS Configuration
AWS_S3_BUCKET=$S3_BUCKET
AWS_REGION=us-east-1

# Deployment Environment
DEPLOY_ENV=$DEPLOY_ENV
DEPLOY_INFRA_TYPE=$DEPLOY_INFRA_TYPE

# Docker Registry
REGISTRY=ghcr.io/yuvro

# Application Settings
SECRET_KEY=change-me-in-production
ALLOWED_HOSTS=*
EOF

chown ec2-user:ec2-user /opt/yuvro/.env
chmod 600 /opt/yuvro/.env

# ===== Create systemd service for Docker Compose =====
echo "=== Creating systemd service for Docker Compose ==="
cat > /etc/systemd/system/yuvro-docker.service << 'SYSTEMD_EOF'
[Unit]
Description=Yuvro Docker Compose Services
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/yuvro
EnvironmentFile=/opt/yuvro/.env
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

systemctl daemon-reload
systemctl enable yuvro-docker.service

# ===== Setup log rotation =====
echo "=== Setting up log rotation ==="
cat > /etc/logrotate.d/yuvro << EOF
/var/log/yuvro/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ec2-user ec2-user
    sharedscripts
}
EOF

# ===== Final setup =====
echo "=== Finalizing setup ==="
echo "Yuvro Production EC2 Host initialized successfully"
echo "Deployment environment: $DEPLOY_ENV"
echo "Infrastructure type: $DEPLOY_INFRA_TYPE"
echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker-compose --version)"
echo "Database endpoint: $DB_HOST:$DB_PORT"
echo "S3 Bucket: $S3_BUCKET"
echo "Check /var/log/yuvro-init.log for detailed initialization logs"

exit 0
