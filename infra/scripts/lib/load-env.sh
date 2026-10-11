#!/bin/bash
# Load environment variables from .env files and output as Helm --set flags
# Usage: load_env_for_helm "ycode-backend-api" "local" "."

load_env_for_helm() {
  local service="$1"
  local env_type="${2:-local}"
  local project_root="${3:-.}"
  
  # Remove -api suffix to get directory name
  local service_dir="$service"
  
  # Determine file paths based on environment
  local env_file=""
  local secrets_file=""
  
  if [ "$env_type" = "prod" ]; then
    env_file="$project_root/$service_dir/.env.prod"
    secrets_file="$project_root/$service_dir/.env.prod-secrets"
  else
    env_file="$project_root/$service_dir/.env.local"
    secrets_file="$project_root/$service_dir/.env.local-secrets"
  fi
  
  # Parse environment file
  if [ -f "$env_file" ]; then
    while IFS= read -r line; do
      # Skip empty lines and comments
      [[ -z "$line" ]] && continue
      [[ "$line" =~ ^# ]] && continue
      
      # Parse key=value
      if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
        local key="${BASH_REMATCH[1]}"
        local value="${BASH_REMATCH[2]}"
        
        # Trim whitespace
        key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        # Skip if value is empty
        [[ -z "$value" ]] && continue
        
        # Escape quotes and output as Helm flag
        value="${value//\"/\\\"}"
        echo "--set env.${key}=\"${value}\""
      fi
    done < "$env_file"
  fi
  
  # Parse secrets file
  if [ -f "$secrets_file" ]; then
    while IFS= read -r line; do
      # Skip empty lines and comments
      [[ -z "$line" ]] && continue
      [[ "$line" =~ ^# ]] && continue
      
      # Parse key=value
      if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
        local key="${BASH_REMATCH[1]}"
        local value="${BASH_REMATCH[2]}"
        
        # Trim whitespace
        key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        # Skip if value is empty
        [[ -z "$value" ]] && continue
        
        # Escape quotes and output as Helm flag
        value="${value//\"/\\\"}"
        echo "--set secrets.${key}=\"${value}\""
      fi
    done < "$secrets_file"
  fi
}
