terraform {
  required_version = ">= 1.2" # For the 'check' block
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Validate that either host_header or path_pattern is set for the ALB rule, but not both.
  check "alb_rule_condition_set" {
    condition     = (var.alb_rule_host_header != null && var.alb_rule_path_pattern == null) || (var.alb_rule_host_header == null && var.alb_rule_path_pattern != null)
    error_message = "Either 'alb_rule_host_header' OR 'alb_rule_path_pattern' must be set for the ALB listener rule, but not both or neither."
  }
}

# This Terraform module deploys a single microservice on AWS ECS Fargate.
# It codifies the law for how a service exists in our world, including its container registry,
# load balancer, and IAM roles based on the Principle of Least Privilege (Covenant 35).

# --- Input Variables ---

variable "service_name" {
  description = "The unique name of the microservice."
  type        = string
}

variable "image_tag" {
  description = "The Docker image tag for the service (e.g., 'my-repo/my-service:latest')."
  type        = string
}

variable "container_port" {
  description = "The port the application listens on inside the container."
  type        = number
}

variable "cpu" {
  description = "The number of CPU units for the ECS task (e.g., 256, 512, 1024, 2048, 4096)."
  type        = number
  default     = 256
}

variable "memory" {
  description = "The amount of memory (in MiB) for the ECS task (e.g., 512, 1024, 2048, 4096, 8192)."
  type        = number
  default     = 512
}

variable "vpc_id" {
  description = "The ID of the VPC where the service will be deployed."
  type        = string
}

variable "subnet_ids" {
  description = "A list of subnet IDs for the ECS tasks and ALB."
  type        = list(string)
}

variable "cluster_arn" {
  description = "The ARN of the ECS cluster to deploy the service into."
  type        = string
}

variable "environment_variables" {
  description = "A map of environment variables to pass to the container."
  type        = map(string)
  default     = {}
}

variable "desired_count" {
  description = "The number of desired tasks for the service."
  type        = number
  default     = 1
}

variable "health_check_path" {
  description = "The path for the ALB health check."
  type        = string
  default     = "/"
}

variable "health_check_interval" {
  description = "The interval (in seconds) for the ALB health check."
  type        = number
  default     = 30
}

variable "health_check_timeout" {
  description = "The timeout (in seconds) for the ALB health check."
  type        = number
  default     = 5
}

variable "health_check_healthy_threshold" {
  description = "The number of consecutive successful health checks required."
  type        = number
  default     = 3
}

variable "health_check_unhealthy_threshold" {
  description = "The number of consecutive failed health checks required."
  type        = number
  default     = 3
}

variable "iam_policy_arns" {
  description = "A list of additional IAM policy ARNs to attach to the ECS task role (Principle of Least Privilege - Covenant 35)."
  type        = list(string)
  default     = []
}

variable "alb_listener_arn" {
  description = "The ARN of an existing ALB listener to attach the target group to."
  type        = string
}

variable "alb_rule_priority" {
  description = "The priority for the ALB listener rule. Lower numbers have higher priority."
  type        = number
}

variable "alb_rule_host_header" {
  description = "Optional host header for the ALB listener rule. If not set, path_pattern must be set."
  type        = string
  default     = null
}

variable "alb_rule_path_pattern" {
  description = "Optional path pattern for the ALB listener rule. If not set, host_header must be set."
  type        = string
  default     = null
}

variable "create_alb_security_group" {
  description = "Whether to create a new security group for the ALB. If false, `existing_alb_security_group_id` must be provided."
  type        = bool
  default     = true

  validation {
    condition     = var.create_alb_security_group || var.existing_alb_security_group_id != null
    error_message = "If `create_alb_security_group` is false, `existing_alb_security_group_id` must be provided."
  }
}

variable "existing_alb_security_group_id" {
  description = "The ID of an existing security group to associate with the ALB. Required if `create_alb_security_group` is false."
  type        = string
  default     = null

  validation {
    condition     = var.existing_alb_security_group_id == null || !var.create_alb_security_group
    error_message = "Cannot provide `existing_alb_security_group_id` if `create_alb_security_group` is true."
  }
}

variable "tags" {
  description = "A map of tags to apply to all resources."
  type        = map(string)
  default     = {}
}

# --- Locals ---
locals {
  alb_security_group_id = var.create_alb_security_group ? aws_security_group.alb_sg[0].id : var.existing_alb_security_group_id
}

# --- Resources ---

# 1. ECR Repository: Stores Docker images for the microservice.
resource "aws_ecr_repository" "this" {
  name                 = var.service_name
  image_tag_mutability = "MUTABLE" # Consider "IMMUTABLE" for production for better traceability
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.tags, {
    Name = "${var.service_name}-ecr"
  })
}

# 2. CloudWatch Log Group: Centralized logging for container output.
resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.service_name}"
  retention_in_days = 30 # Adjust retention as per compliance/cost requirements

  tags = merge(var.tags, {
    Name = "${var.service_name}-logs"
  })
}

# 3. IAM Roles for ECS: Adhering to Principle of Least Privilege (Covenant 35).

# Task Execution Role: Allows ECS agent to pull images from ECR and send logs to CloudWatch.
resource "aws_iam_role" "ecs_task_execution_role" {
  name               = "${var.service_name}-ecs-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_execution_assume_role.json

  tags = merge(var.tags, {
    Name = "${var.service_name}-ecs-task-execution-role"
  })
}

data "aws_iam_policy_document" "ecs_task_execution_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task Role: For the application running inside the container to interact with other AWS services.
# This role should be granted only the permissions absolutely necessary for the service to function.
resource "aws_iam_role" "ecs_task_role" {
  name               = "${var.service_name}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = merge(var.tags, {
    Name = "${var.service_name}-ecs-task-role"
  })
}

data "aws_iam_policy_document" "ecs_task_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Attach additional policies specified by the user for fine-grained permissions.
resource "aws_iam_role_policy_attachment" "additional_task_policies" {
  count      = length(var.iam_policy_arns)
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = var.iam_policy_arns[count.index]
}

# 4. Security Groups

# Security Group for ECS Tasks: Allows inbound traffic from the ALB.
resource "aws_security_group" "ecs_task_sg" {
  name        = "${var.service_name}-ecs-task-sg"
  description = "Allow inbound traffic to ECS tasks from ALB"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [local.alb_security_group_id] # Only allow traffic from the ALB's security group
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # Allow all outbound traffic (can be restricted further)
  }

  tags = merge(var.tags, {
    Name = "${var.service_name}-ecs-task-sg"
  })
}

# Security Group for ALB: Allows public HTTP/HTTPS access to the Load Balancer.
resource "aws_security_group" "alb_sg" {
  count       = var.create_alb_security_group ? 1 : 0
  name        = "${var.service_name}-alb-sg"
  description = "Allow HTTP/HTTPS inbound traffic to ALB"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Allow HTTP from anywhere
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Allow HTTPS from anywhere
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # Allow all outbound traffic
  }

  tags = merge(var.tags, {
    Name = "${var.service_name}-alb-sg"
  })
}

# 5. ECS Task Definition: Defines the container, resources, and logging.
resource "aws_ecs_task_definition" "this" {
  family                   = var.service_name
  cpu                      = var.cpu
  memory                   = var.memory
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name        = var.service_name
      image       = "${aws_ecr_repository.this.repository_url}:${var.image_tag}"
      cpu         = var.cpu
      memory      = var.memory
      essential   = true
      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        }
      ]
      environment = [for k, v in var.environment_variables : { name = k, value = v }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.service_name}-task-definition"
  })
}

# Get current AWS region for log configuration
data "aws_region" "current" {}

# 6. ALB Target Group: Routes traffic from the ALB to the ECS tasks.
resource "aws_lb_target_group" "this" {
  name        = "${var.service_name}-tg"
  port        = var.container_port
  protocol    = "HTTP" # Use HTTPS if your service handles SSL internally
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = var.health_check_path
    protocol            = "HTTP"
    matcher             = "200-299"
    interval            = var.health_check_interval
    timeout             = var.health_check_timeout
    healthy_threshold   = var.health_check_healthy_threshold
    unhealthy_threshold = var.health_check_unhealthy_threshold
  }

  tags = merge(var.tags, {
    Name = "${var.service_name}-target-group"
  })
}

# 7. ALB Listener Rule: Defines how the ALB routes incoming requests to the target group.
resource "aws_lb_listener_rule" "this" {
  listener_arn = var.alb_listener_arn
  priority     = var.alb_rule_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }

  condition {
    # Dynamically include host_header condition if provided
    dynamic "host_header" {
      for_each = var.alb_rule_host_header != null ? [1] : []
      content {
        values = [var.alb_rule_host_header]
      }
    }
    # Dynamically include path_pattern condition if provided
    dynamic "path_pattern" {
      for_each = var.alb_rule_path_pattern != null ? [1] : []
      content {
        values = [var.alb_rule_path_pattern]
      }
    }
  }
}

# 8. ECS Service: Manages the desired count and deployment of tasks.
resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = var.cluster_arn
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.ecs_task_sg.id]
    assign_public_ip = false # Fargate tasks typically don't need public IPs
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = var.service_name
    container_port   = var.container_port
  }

  # Deployment configuration for robust updates
  deployment_controller {
    type = "ECS"
  }
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  health_check_grace_period_seconds = 60 # Give service time to start up and pass health checks

  tags = merge(var.tags, {
    Name = "${var.service_name}-ecs-service"
  })
}

# --- Outputs ---

output "ecr_repository_url" {
  description = "The URL of the ECR repository where the service's Docker images are stored."
  value       = aws_ecr_repository.this.repository_url
}

output "ecs_service_name" {
  description = "The name of the deployed ECS service."
  value       = aws_ecs_service.this.name
}

output "alb_target_group_arn" {
  description = "The ARN of the ALB target group associated with this service."
  value       = aws_lb_target_group.this.arn
}

output "ecs_task_role_arn" {
  description = "The ARN of the ECS task role, which can be used to attach additional fine-grained policies."
  value       = aws_iam_role.ecs_task_role.arn
}

output "ecs_task_execution_role_arn" {
  description = "The ARN of the ECS task execution role."
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_security_group_id" {
  description = "The ID of the security group created for ECS tasks."
  value       = aws_security_group.ecs_task_sg.id
}

output "alb_security_group_id" {
  description = "The ID of the security group created for the ALB (if created by this module)."
  value       = local.alb_security_group_id
}