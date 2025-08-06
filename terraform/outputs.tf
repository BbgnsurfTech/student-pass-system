# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnets
}

# EKS Outputs
output "eks_cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "eks_cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "eks_cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "eks_cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_cluster_version" {
  description = "The Kubernetes version for the EKS cluster"
  value       = module.eks.cluster_version
}

output "eks_oidc_provider_arn" {
  description = "The ARN of the OIDC Provider if enabled"
  value       = module.eks.oidc_provider_arn
}

output "eks_node_groups" {
  description = "EKS node groups"
  value       = module.eks.node_groups
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.database_name
}

output "rds_username" {
  description = "RDS instance username"
  value       = module.rds.username
  sensitive   = true
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = module.rds.security_group_id
}

# ElastiCache Outputs
output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache.endpoint
}

output "redis_port" {
  description = "Redis port"
  value       = module.elasticache.port
}

output "redis_security_group_id" {
  description = "Redis security group ID"
  value       = module.elasticache.security_group_id
}

# S3 Outputs
output "s3_assets_bucket_name" {
  description = "Name of the S3 assets bucket"
  value       = module.s3.assets_bucket_name
}

output "s3_assets_bucket_arn" {
  description = "ARN of the S3 assets bucket"
  value       = module.s3.assets_bucket_arn
}

output "s3_backups_bucket_name" {
  description = "Name of the S3 backups bucket"
  value       = module.s3.backups_bucket_name
}

output "s3_logs_bucket_name" {
  description = "Name of the S3 logs bucket"
  value       = module.s3.logs_bucket_name
}

# IAM Outputs
output "backend_irsa_role_arn" {
  description = "ARN of the backend IRSA role"
  value       = module.irsa.iam_role_arn
}

# Monitoring Outputs
output "grafana_endpoint" {
  description = "Grafana endpoint"
  value       = module.monitoring.grafana_endpoint
}

output "prometheus_endpoint" {
  description = "Prometheus endpoint"
  value       = module.monitoring.prometheus_endpoint
}

# DNS and SSL Outputs
output "route53_zone_id" {
  description = "Route53 zone ID"
  value       = var.create_route53_zone ? aws_route53_zone.main[0].zone_id : null
}

output "route53_name_servers" {
  description = "Route53 name servers"
  value       = var.create_route53_zone ? aws_route53_zone.main[0].name_servers : null
}

output "ssl_certificate_arn" {
  description = "SSL certificate ARN"
  value       = var.create_ssl_certificate ? aws_acm_certificate.main[0].arn : null
}

# Application URLs
output "application_urls" {
  description = "Application URLs"
  value = {
    frontend = var.create_route53_zone ? "https://${var.domain_name}" : "Check Load Balancer DNS"
    backend  = var.create_route53_zone ? "https://api.${var.domain_name}" : "Check Load Balancer DNS"
    grafana  = module.monitoring.grafana_endpoint
  }
}

# Kubernetes Configuration
output "kubectl_config" {
  description = "kubectl config command"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

# Environment Information
output "environment_info" {
  description = "Environment information"
  value = {
    project_name = var.project_name
    environment  = var.environment
    aws_region   = var.aws_region
    vpc_cidr     = var.vpc_cidr
  }
}