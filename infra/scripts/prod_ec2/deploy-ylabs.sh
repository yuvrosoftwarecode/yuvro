#!/bin/bash
# Deploy YLabs (part of unified prod deployment)
# This is a convenience alias for deploy-all.sh
# Use: bash infra/scripts/prod_ec2/deploy-all.sh

exec bash "$(dirname "$0")/deploy-all.sh" "$@"
