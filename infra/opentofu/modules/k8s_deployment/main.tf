# Kubernetes Deployment Module
# Manages namespace creation, secrets, and Helm release deployment

# Create namespace
resource "kubernetes_namespace" "main" {
  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/name"       = "yuvro"
      "app.kubernetes.io/environment" = var.environment
    }
  }
}

# Create database credentials secret
resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "yuvro-db-credentials"
    namespace = kubernetes_namespace.main.metadata[0].name
  }

  type = "Opaque"

  data = {
    "ycode-database-url"       = "postgresql://${var.database_user}:${urlencode(var.database_password)}@${var.database_host}:${var.database_port}/ycode?sslmode=require"
    "ycampus-database-url"     = "postgresql://${var.database_user}:${urlencode(var.database_password)}@${var.database_host}:${var.database_port}/ycampus?sslmode=require"
    "ylabs-database-url"       = "postgresql://${var.database_user}:${urlencode(var.database_password)}@${var.database_host}:${var.database_port}/ylabs?sslmode=require"
    "yhub-database-url"        = "postgresql://${var.database_user}:${urlencode(var.database_password)}@${var.database_host}:${var.database_port}/yhub?sslmode=require"
    "ymarketplace-database-url" = "postgresql://${var.database_user}:${urlencode(var.database_password)}@${var.database_host}:${var.database_port}/ymarketplace?sslmode=require"
    "database-host"            = var.database_host
    "database-port"            = tostring(var.database_port)
    "database-user"            = var.database_user
    "database-password"        = var.database_password
  }

  depends_on = [kubernetes_namespace.main]
}

# Load Helm values file (support both values.yaml and environment-specific files)
locals {
  # Try environment-specific values first (e.g., values-prod.yaml), fall back to values.yaml
  helm_values_prod_path = "${var.helm_chart_path}/values-${var.environment}.yaml"
  helm_values_default_path = "${var.helm_chart_path}/${var.helm_values_file}"
  
  # Check which file exists
  helm_values_path = fileexists(local.helm_values_prod_path) ? local.helm_values_prod_path : local.helm_values_default_path
  helm_values      = try(yamldecode(file(local.helm_values_path)), {})
}

# Merge apps_enabled configuration into Helm values
locals {
  merged_values = merge(
    local.helm_values,
    {
      global = merge(
        try(local.helm_values.global, {}),
        {
          namespace      = kubernetes_namespace.main.metadata[0].name
          database_host  = var.database_host
          database_port  = var.database_port
          environment    = var.environment
        }
      )
      ycode       = merge(try(local.helm_values.ycode, {}), { enabled = try(var.apps_enabled["ycode"], true) })
      ycampus     = merge(try(local.helm_values.ycampus, {}), { enabled = try(var.apps_enabled["ycampus"], true) })
      ylabs       = merge(try(local.helm_values.ylabs, {}), { enabled = try(var.apps_enabled["ylabs"], true) })
      yhub        = merge(try(local.helm_values.yhub, {}), { enabled = try(var.apps_enabled["yhub"], true) })
      ymarketplace = merge(try(local.helm_values.ymarketplace, {}), { enabled = try(var.apps_enabled["ymarketplace"], true) })
    }
  )
}

# Deploy Helm chart
resource "helm_release" "yuvro" {
  name            = "yuvro"
  chart           = var.helm_chart_path
  namespace       = kubernetes_namespace.main.metadata[0].name
  create_namespace = false

  values = [
    yamlencode(local.merged_values)
  ]

  depends_on = [
    kubernetes_namespace.main,
    kubernetes_secret.db_credentials
  ]

  wait = true
  wait_for_jobs = true
  timeout = 600
}
