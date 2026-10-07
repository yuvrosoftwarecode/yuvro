#!/bin/bash
# deploy-common-k8s.sh — K8s-specific helpers for Yuvro deployment
# Provides functions for EKS, kubectl, and Helm operations
# Sourced by deploy-all.sh and prod-specific scripts

# ── K8s validation ────────────────────────────────────────────────────────────

check_k8s_prerequisites() {
    print_header "Checking Kubernetes Prerequisites"
    local missing=0
    
    for tool in tofu aws kubectl helm; do
        if command -v $tool &>/dev/null; then
            print_success "$tool found"
        else
            print_error "$tool not installed"
            missing=1
        fi
    done
    
    # Check AWS credentials
    if aws sts get-caller-identity &>/dev/null; then
        local account=$(aws sts get-caller-identity --query Account --output text)
        print_success "AWS Account: $account"
    else
        print_error "AWS credentials not configured"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        print_error "Fix missing tools and retry"
        return 1
    fi
    return 0
}

# ── EKS cluster operations ───────────────────────────────────────────────────

check_eks_cluster() {
    local cluster_name="${1:-yuvro-prod-cluster}"
    local region="${2:-ap-south-1}"
    
    print_info "Checking EKS cluster: $cluster_name"
    
    # Check if cluster exists
    if aws eks describe-cluster --name "$cluster_name" --region "$region" &>/dev/null 2>&1; then
        print_success "EKS cluster found: $cluster_name"
        return 0
    else
        print_warning "EKS cluster not found: $cluster_name"
        return 1
    fi
}

configure_kubectl() {
    local cluster_name="${1:-yuvro-prod-cluster}"
    local region="${2:-ap-south-1}"
    
    print_step "Configuring kubectl for EKS cluster..."
    
    if aws eks update-kubeconfig --name "$cluster_name" --region "$region" &>/dev/null; then
        print_success "kubectl configured for: $cluster_name"
        
        # Verify connection
        if kubectl cluster-info &>/dev/null; then
            print_success "kubectl connected to cluster"
            kubectl cluster-info | grep -E 'Kubernetes|API' | head -1
            return 0
        else
            print_error "kubectl not connected to cluster"
            return 1
        fi
    else
        print_error "Failed to update kubeconfig"
        return 1
    fi
}

get_cluster_info() {
    local cluster_name="${1:-yuvro-prod-cluster}"
    local region="${2:-ap-south-1}"
    
    print_info "EKS Cluster Details:"
    aws eks describe-cluster \
        --name "$cluster_name" \
        --region "$region" \
        --query 'cluster.[name,status,version,endpoint]' \
        --output table 2>/dev/null || print_warning "Could not fetch cluster info"
    
    print_info "Node Groups:"
    aws eks list-nodegroups \
        --cluster-name "$cluster_name" \
        --region "$region" \
        --output table 2>/dev/null || print_warning "Could not fetch node groups"
}

wait_for_cluster() {
    local cluster_name="${1:-yuvro-prod-cluster}"
    local region="${2:-ap-south-1}"
    local max_retries="${3:-60}"
    
    print_header "Waiting for EKS Cluster to be ACTIVE"
    
    local retries=0
    while [ $retries -lt $max_retries ]; do
        local status=$(aws eks describe-cluster \
            --name "$cluster_name" \
            --region "$region" \
            --query 'cluster.status' \
            --output text 2>/dev/null)
        
        if [ "$status" = "ACTIVE" ]; then
            print_success "Cluster is ACTIVE"
            return 0
        fi
        
        retries=$((retries + 1))
        print_info "Status: $status... ($retries/$max_retries)"
        sleep 10
    done
    
    print_error "Cluster did not reach ACTIVE status in $(( max_retries * 10 / 60 ))m"
    return 1
}

wait_for_nodes() {
    local namespace="${1:-yuvro-production}"
    local expected_nodes="${2:-3}"
    local max_retries="${3:-60}"
    
    print_header "Waiting for Kubernetes Nodes to be Ready"
    
    local retries=0
    while [ $retries -lt $max_retries ]; do
        local ready_nodes=$(kubectl get nodes \
            --no-headers \
            --query-sort-by='.status.conditions[?(@.type=="Ready")].status' \
            2>/dev/null | grep -c "True" || echo "0")
        
        print_info "Nodes ready: $ready_nodes/$expected_nodes ($retries/$max_retries)"
        
        if [ "$ready_nodes" -ge "$expected_nodes" ]; then
            print_success "All nodes are Ready"
            kubectl get nodes -o wide
            return 0
        fi
        
        retries=$((retries + 1))
        sleep 10
    done
    
    print_error "Nodes did not reach Ready status in $(( max_retries * 10 / 60 ))m"
    return 1
}

# ── Kubernetes namespace and secrets ──────────────────────────────────────────

create_namespace() {
    local namespace="${1:-yuvro-production}"
    
    print_step "Creating Kubernetes namespace: $namespace"
    
    if kubectl get namespace "$namespace" &>/dev/null 2>&1; then
        print_warning "Namespace already exists: $namespace"
    else
        if kubectl create namespace "$namespace"; then
            print_success "Namespace created: $namespace"
        else
            print_error "Failed to create namespace"
            return 1
        fi
    fi
    
    # Label namespace
    kubectl label namespace "$namespace" \
        "app.kubernetes.io/name=yuvro" \
        "app.kubernetes.io/environment=production" \
        --overwrite 2>/dev/null
    
    return 0
}

create_db_secret() {
    local namespace="${1:-yuvro-production}"
    local db_host="${2}"
    local db_port="${3:-5432}"
    local db_user="${4:-yuvro_admin}"
    local db_password="${5}"
    
    print_step "Creating database credentials secret..."
    
    if [ -z "$db_host" ] || [ -z "$db_password" ]; then
        print_error "Missing database configuration"
        return 1
    fi
    
    # Create secret with connection strings for all apps
    kubectl create secret generic yuvro-db-credentials \
        --namespace="$namespace" \
        --from-literal="database-host=$db_host" \
        --from-literal="database-port=$db_port" \
        --from-literal="database-user=$db_user" \
        --from-literal="database-password=$db_password" \
        --from-literal="ycode-database-url=postgresql://${db_user}:${db_password}@${db_host}:${db_port}/ycode?sslmode=require" \
        --from-literal="ycampus-database-url=postgresql://${db_user}:${db_password}@${db_host}:${db_port}/ycampus?sslmode=require" \
        --from-literal="ylabs-database-url=postgresql://${db_user}:${db_password}@${db_host}:${db_port}/ylabs?sslmode=require" \
        --from-literal="yhub-database-url=postgresql://${db_user}:${db_password}@${db_host}:${db_port}/yhub?sslmode=require" \
        --from-literal="ymarketplace-database-url=postgresql://${db_user}:${db_password}@${db_host}:${db_port}/ymarketplace?sslmode=require" \
        --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Database secret created/updated"
        return 0
    else
        print_error "Failed to create database secret"
        return 1
    fi
}

# ── Helm operations ──────────────────────────────────────────────────────────

validate_helm_chart() {
    local chart_path="${1:-./helm/yuvro-production}"
    
    print_step "Validating Helm chart: $chart_path"
    
    if helm lint "$chart_path" 2>/dev/null; then
        print_success "Helm chart is valid"
        return 0
    else
        print_error "Helm chart validation failed"
        return 1
    fi
}

deploy_helm_release() {
    local namespace="${1:-yuvro-production}"
    local chart_path="${2:-./helm/yuvro-production}"
    local release_name="${3:-yuvro}"
    local values_file="${4}"
    
    print_header "Deploying Helm Release: $release_name"
    
    # Build helm upgrade command
    local helm_cmd="helm upgrade --install $release_name $chart_path"
    helm_cmd="$helm_cmd --namespace $namespace --create-namespace"
    
    if [ -n "$values_file" ] && [ -f "$values_file" ]; then
        helm_cmd="$helm_cmd -f $values_file"
    fi
    
    helm_cmd="$helm_cmd --wait --timeout 10m"
    
    print_info "Command: $helm_cmd"
    
    if eval "$helm_cmd"; then
        print_success "Helm release deployed: $release_name"
        sleep 5
        return 0
    else
        print_error "Failed to deploy Helm release"
        return 1
    fi
}

# ── Deployment verification ──────────────────────────────────────────────────

wait_for_deployments() {
    local namespace="${1:-yuvro-production}"
    local max_retries="${2:-60}"
    
    print_header "Waiting for Deployments to be Ready"
    
    local retries=0
    while [ $retries -lt $max_retries ]; do
        local ready=$(kubectl get deployments -n "$namespace" \
            --no-headers 2>/dev/null | wc -l)
        local replicas_ready=$(kubectl get deployments -n "$namespace" \
            --no-headers 2>/dev/null | \
            awk '{if ($2==$3 && $3==$4) print $1}' | wc -l)
        
        print_info "Deployments: $replicas_ready/$ready ready ($retries/$max_retries)"
        
        if [ "$ready" -gt 0 ] && [ "$replicas_ready" -eq "$ready" ]; then
            print_success "All deployments are ready"
            kubectl get deployments -n "$namespace"
            return 0
        fi
        
        retries=$((retries + 1))
        sleep 10
    done
    
    print_error "Deployments did not reach ready status"
    return 1
}

check_pod_status() {
    local namespace="${1:-yuvro-production}"
    
    print_info "Pod Status in $namespace:"
    kubectl get pods -n "$namespace" -o wide 2>/dev/null
    
    # Check for failed pods
    local failed=$(kubectl get pods -n "$namespace" \
        --field-selector=status.phase=Failed --no-headers 2>/dev/null | wc -l)
    
    if [ "$failed" -gt 0 ]; then
        print_warning "Found $failed failed pods"
        kubectl get pods -n "$namespace" --field-selector=status.phase=Failed
        return 1
    fi
    
    return 0
}

check_logs() {
    local namespace="${1:-yuvro-production}"
    local deployment="${2:-ycode-backend}"
    local lines="${3:-50}"
    
    print_info "Logs from $deployment (last $lines lines):"
    kubectl logs -n "$namespace" \
        deployment/"$deployment" \
        --tail="$lines" \
        --all-containers=true 2>/dev/null || print_warning "Could not fetch logs"
}

# ── Health checks ────────────────────────────────────────────────────────────

health_check_pods() {
    local namespace="${1:-yuvro-production}"
    
    print_header "Health Checks - Pod Readiness"
    
    local not_ready=0
    while IFS= read -r pod; do
        if kubectl get pod "$pod" -n "$namespace" \
            --no-headers 2>/dev/null | grep -qv "Running"; then
            print_warning "Pod not ready: $pod"
            not_ready=$((not_ready + 1))
        else
            print_success "Pod ready: $pod"
        fi
    done < <(kubectl get pods -n "$namespace" --no-headers -o name 2>/dev/null | cut -d'/' -f2)
    
    if [ $not_ready -eq 0 ]; then
        print_success "All pods are running"
        return 0
    else
        print_warning "Found $not_ready pods not ready"
        return 1
    fi
}

health_check_services() {
    local namespace="${1:-yuvro-production}"
    
    print_info "Service Status in $namespace:"
    kubectl get services -n "$namespace" -o wide 2>/dev/null
}

health_check_endpoints() {
    local namespace="${1:-yuvro-production}"
    
    print_info "Endpoints in $namespace:"
    kubectl get endpoints -n "$namespace" 2>/dev/null
}

# ── Cluster cleanup ──────────────────────────────────────────────────────────

delete_namespace() {
    local namespace="${1:-yuvro-production}"
    
    print_warning "Deleting namespace: $namespace"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        if kubectl delete namespace "$namespace"; then
            print_success "Namespace deleted"
            return 0
        else
            print_error "Failed to delete namespace"
            return 1
        fi
    else
        print_info "Cancelled"
        return 1
    fi
}

# ── Diagnostic functions ────────────────────────────────────────────────────

collect_diagnostics() {
    local namespace="${1:-yuvro-production}"
    local output_dir="${2:-./k8s-diagnostics-$(date +%s)}"
    
    print_header "Collecting Kubernetes Diagnostics"
    mkdir -p "$output_dir"
    
    print_step "Collecting cluster info..."
    kubectl version --short > "$output_dir/version.txt"
    kubectl get nodes -o wide > "$output_dir/nodes.txt"
    kubectl get namespaces > "$output_dir/namespaces.txt"
    
    print_step "Collecting namespace resources..."
    kubectl get all -n "$namespace" -o wide > "$output_dir/resources.txt"
    kubectl get events -n "$namespace" > "$output_dir/events.txt"
    kubectl get secrets -n "$namespace" > "$output_dir/secrets.txt"
    kubectl get configmaps -n "$namespace" > "$output_dir/configmaps.txt"
    
    print_step "Collecting logs..."
    mkdir -p "$output_dir/logs"
    for pod in $(kubectl get pods -n "$namespace" --no-headers -o name 2>/dev/null | cut -d'/' -f2); do
        kubectl logs "$pod" -n "$namespace" --all-containers=true > "$output_dir/logs/$pod.log" 2>&1 &
    done
    wait
    
    print_success "Diagnostics collected in: $output_dir"
    ls -lah "$output_dir"
}

# ── Output functions ────────────────────────────────────────────────────────

show_access_info() {
    local namespace="${1:-yuvro-production}"
    local cluster_name="${2:-yuvro-prod-cluster}"
    
    print_header "Kubernetes Access Information"
    echo ""
    echo "  Cluster Name: $cluster_name"
    echo "  Namespace: $namespace"
    echo ""
    echo "  Access cluster:"
    echo "    kubectl cluster-info"
    echo ""
    echo "  View deployments:"
    echo "    kubectl get deployments -n $namespace"
    echo ""
    echo "  View pods:"
    echo "    kubectl get pods -n $namespace"
    echo ""
    echo "  View logs:"
    echo "    kubectl logs -n $namespace -f deployment/<app>"
    echo ""
    echo "  Port forward:"
    echo "    kubectl port-forward -n $namespace svc/<service> 8000:8000"
    echo ""
    echo "  View Helm releases:"
    echo "    helm list -n $namespace"
    echo ""
}
