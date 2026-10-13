# Kubernetes Deployment Module Outputs

output "namespace" {
  description = "Kubernetes namespace"
  value       = kubernetes_namespace.main.metadata[0].name
}

output "db_secret_name" {
  description = "Name of Kubernetes secret containing database credentials (managed by Helm chart)"
  value       = "yuvro-db-credentials"
}

output "release_name" {
  description = "Helm release name"
  value       = helm_release.yuvro.name
}

output "release_status" {
  description = "Helm release status"
  value       = helm_release.yuvro.status
}

output "release_namespace" {
  description = "Helm release namespace"
  value       = helm_release.yuvro.namespace
}

output "deployment_guide" {
  description = "Guide for verifying Kubernetes deployment"
  value       = <<-EOT
    Kubernetes Deployment Summary:
    
    Namespace: ${kubernetes_namespace.main.metadata[0].name}
    Secret: yuvro-db-credentials (managed by Helm chart)
    Helm Release: ${helm_release.yuvro.name}
    Status: ${helm_release.yuvro.status}
    
    Verify deployment:
    
    1. Check namespace and secret:
       kubectl get namespace ${kubernetes_namespace.main.metadata[0].name}
       kubectl -n ${kubernetes_namespace.main.metadata[0].name} get secrets
    
    2. Check Helm release:
       helm list -n ${kubernetes_namespace.main.metadata[0].name}
       helm status ${helm_release.yuvro.name} -n ${kubernetes_namespace.main.metadata[0].name}
    
    3. Check deployed resources:
       kubectl -n ${kubernetes_namespace.main.metadata[0].name} get deployments
       kubectl -n ${kubernetes_namespace.main.metadata[0].name} get services
       kubectl -n ${kubernetes_namespace.main.metadata[0].name} get pods
    
    4. View logs:
       kubectl -n ${kubernetes_namespace.main.metadata[0].name} logs -f deployment/ycode-backend
  EOT
}
