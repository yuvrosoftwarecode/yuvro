# Kubernetes Deployment Module
# Manages namespace creation, secrets, and Helm release deployment

# Create Kubernetes namespace with Helm ownership labels
resource "kubernetes_namespace" "main" {
  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/managed-by" = "Helm"
      "app.kubernetes.io/name"       = "yuvro"
    }
    annotations = {
      "meta.helm.sh/release-name"      = "yuvro"
      "meta.helm.sh/release-namespace" = var.namespace
    }
  }

  depends_on = []
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

# Deploy Helm chart - Use absolute path to helm chart
resource "helm_release" "yuvro" {
  name            = "yuvro"
  chart           = "/Users/devendradora/projects-other/yuvro/helm/yuvro-production"
  namespace       = var.namespace
  create_namespace = false  # Namespace is created by kubernetes_namespace resource below

  values = [
    yamlencode(local.merged_values)
  ]

  # Wait for namespace to be created first
  depends_on = [
    kubernetes_namespace.main
  ]

  wait = false  # Don't wait for all resources to be ready (images are invalid)
  timeout = 300
}
