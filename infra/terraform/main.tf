terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # Specify a suitable version range
    }
  }

  # S3 Backend for state management, as per Covenant 39's law of infrastructure
  # This ensures state is stored securely, versioned, and accessible for collaboration.
  backend "s3" {
    bucket         = "infiniteai-ai-banking-tf-state" # Unique S3 bucket for Terraform state
    key            = "global/main.tfstate"             # Path to the state file within the bucket
    region         = "us-east-1"                       # AWS region for the S3 bucket
    encrypt        = true                              # Encrypt state at rest
    dynamodb_table = "infiniteai-ai-banking-tf-lock"   # DynamoDB table for state locking
  }
}

# Configure the AWS Provider
# This block declares the cloud provider for all subsequent resource definitions.
provider "aws" {
  region = "us-east-1" # Default AWS region for all resources unless overridden
  # You can also configure credentials here, but it's recommended to use
  # environment variables, shared credentials file, or IAM roles for production.
  # access_key = var.aws_access_key
  # secret_key = var.aws_secret_key
}