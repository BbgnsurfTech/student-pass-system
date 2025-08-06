terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    # Configure this in terraform init
    # bucket         = "student-pass-terraform-state"
    # key            = "infrastructure/terraform.tfstate"
    # region         = "us-east-1"
    # encrypt        = true
    # dynamodb_table = "student-pass-terraform-lock"
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "student-pass-system"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "platform-team"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project_name}-${var.environment}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Single NAT Gateway for cost optimization in staging
  single_nat_gateway = var.environment == "staging" ? true : false

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
    "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "owned"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "owned"
  }

  tags = {
    "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "shared"
  }
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"
  
  project_name = var.project_name
  environment = var.environment
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
  public_subnet_ids = module.vpc.public_subnets
  
  cluster_version = var.eks_cluster_version
  node_groups = var.eks_node_groups
  
  depends_on = [module.vpc]
}

# RDS PostgreSQL
module "rds" {
  source = "./modules/rds"
  
  project_name = var.project_name
  environment = var.environment
  
  vpc_id                = module.vpc.vpc_id
  subnet_ids           = module.vpc.private_subnets
  allowed_security_groups = [module.eks.worker_security_group_id]
  
  instance_class       = var.rds_instance_class
  allocated_storage    = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  
  database_name = var.database_name
  database_username = var.database_username
  database_password = var.database_password
  
  backup_retention_period = var.rds_backup_retention_period
  backup_window          = var.rds_backup_window
  maintenance_window     = var.rds_maintenance_window
  
  depends_on = [module.vpc, module.eks]
}

# ElastiCache Redis
module "elasticache" {
  source = "./modules/elasticache"
  
  project_name = var.project_name
  environment = var.environment
  
  vpc_id                = module.vpc.vpc_id
  subnet_ids           = module.vpc.private_subnets
  allowed_security_groups = [module.eks.worker_security_group_id]
  
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_cache_nodes
  parameter_group_name = var.redis_parameter_group_name
  port                 = 6379
  
  depends_on = [module.vpc, module.eks]
}

# S3 Buckets
module "s3" {
  source = "./modules/s3"
  
  project_name = var.project_name
  environment = var.environment
  
  create_assets_bucket = true
  create_backups_bucket = true
  create_logs_bucket = true
}

# Monitoring and Observability
module "monitoring" {
  source = "./modules/monitoring"
  
  project_name = var.project_name
  environment = var.environment
  
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  eks_cluster_name = module.eks.cluster_name
  
  depends_on = [module.eks]
}

# IAM Roles for Service Accounts (IRSA)
module "irsa" {
  source = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name = "${var.project_name}-${var.environment}-backend-irsa"

  attach_external_dns_policy = true
  attach_aws_load_balancer_controller_policy = true
  
  # S3 access for backend
  role_policy_arns = {
    s3_policy = aws_iam_policy.backend_s3_policy.arn
  }

  oidc_providers = {
    ex = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["student-pass-system:backend-service-account"]
    }
  }

  depends_on = [module.eks]
}

# S3 Policy for Backend
resource "aws_iam_policy" "backend_s3_policy" {
  name_prefix = "${var.project_name}-${var.environment}-backend-s3"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          module.s3.assets_bucket_arn,
          "${module.s3.assets_bucket_arn}/*"
        ]
      }
    ]
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/aws/eks/${var.project_name}-${var.environment}/application"
  retention_in_days = var.environment == "production" ? 30 : 7
  
  tags = {
    Environment = var.environment
    Application = "student-pass-system"
  }
}

# Route53 Hosted Zone (if managing DNS)
resource "aws_route53_zone" "main" {
  count = var.create_route53_zone ? 1 : 0
  name  = var.domain_name

  tags = {
    Environment = var.environment
  }
}

# ACM Certificate
resource "aws_acm_certificate" "main" {
  count = var.create_ssl_certificate ? 1 : 0
  
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = var.environment
  }
}

# Certificate Validation
resource "aws_acm_certificate_validation" "main" {
  count = var.create_ssl_certificate && var.create_route53_zone ? 1 : 0
  
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route53 Records for Certificate Validation
resource "aws_route53_record" "cert_validation" {
  for_each = var.create_ssl_certificate && var.create_route53_zone ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main[0].zone_id
}