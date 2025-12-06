# --- GKE Cluster Definition ---

resource "google_container_cluster" "ai_banking_cluster" {
  project                  = var.project_id
  name                     = var.cluster_name
  location                 = var.region
  initial_node_count       = 1 # We manage nodes via separate node pools

  # Networking Configuration (Assumes VPC and secondary ranges are pre-configured)
  network                  = var.vpc_network_name
  subnetwork               = var.vpc_subnetwork_name
  ip_allocation_policy {
    cluster_secondary_range_name  = "k8s-pods"
    services_secondary_range_name = "k8s-services"
  }

  # Release Channel (Stable recommended for production)
  release_channel {
    channel = "STABLE"
  }

  # Security and Access: Private Cluster Setup
  private_cluster_config {
    enable_private_endpoint = true
    enable_private_nodes    = true
    master_ipv4_cidr_block  = "10.10.0.0/28"
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = var.admin_cidr_block
      display_name = "Admin Access"
    }
  }

  # Workload Identity for secure access to GCP services
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Maintenance window
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }

  # Disable the default node pool created by GKE
  remove_default_node_pool = true

  timeouts {
    create = "30m"
    update = "30m"
  }
}

# --- Standard Node Pool (General Services and System Components) ---

resource "google_container_node_pool" "standard_pool" {
  project    = var.project_id
  location   = var.region
  cluster    = google_container_cluster.ai_banking_cluster.name
  name       = "${var.cluster_name}-standard-pool"
  node_count = var.standard_node_count

  node_config {
    machine_type = "e2-medium"
    disk_size_gb = 100
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
    metadata = {
      disable-legacy-endpoints = "true"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# --- High Compute Node Pool (AI/ML Banking Workloads and Federation Services) ---

resource "google_container_node_pool" "compute_pool" {
  project  = var.project_id
  location = var.region
  cluster  = google_container_cluster.ai_banking_cluster.name
  name     = "${var.cluster_name}-compute-pool"

  # Autoscaling configuration for dynamic AI workloads
  autoscaling {
    max_node_count = var.compute_max_nodes
    min_node_count = var.compute_min_nodes
  }

  node_config {
    # High-performance machine type
    machine_type = "n2-standard-4"
    disk_size_gb = 200
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
    metadata = {
      disable-legacy-endpoints = "true"
    }

    # Taints to ensure only specific, high-priority workloads run here
    taint {
      key    = "workload"
      value  = "ai-banking"
      effect = "NO_SCHEDULE"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# --- Outputs ---

output "kubernetes_cluster_name" {
  description = "The name of the GKE cluster."
  value       = google_container_cluster.ai_banking_cluster.name
}

output "kubernetes_endpoint" {
  description = "The private endpoint of the GKE cluster."
  value       = google_container_cluster.ai_banking_cluster.endpoint
}

output "kubernetes_master_version" {
  description = "The master version of the GKE cluster."
  value       = google_container_cluster.ai_banking_cluster.master_version
}

output "kubernetes_cluster_location" {
  description = "The region where the GKE cluster is deployed."
  value       = google_container_cluster.ai_banking_cluster.location
}