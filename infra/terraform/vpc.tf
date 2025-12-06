resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "infiniteai-vpc"
    Project     = "infiniteai-banking"
    Environment = "production"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "infiniteai-igw"
    Project     = "infiniteai-banking"
    Environment = "production"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

# Define Availability Zones for multi-AZ deployment
data "aws_availability_zones" "available" {
  state = "available"
}

# Public Subnets (for Load Balancers, public-facing services)
resource "aws_subnet" "public" {
  count                   = 2 # Deploy in 2 AZs
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index) # 10.0.0.0/24, 10.0.1.0/24
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "infiniteai-public-subnet-${count.index + 1}"
    Project     = "infiniteai-banking"
    Environment = "production"
    Tier        = "Public"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

# Private Subnets (for Application Servers, Databases)
resource "aws_subnet" "private" {
  count             = 2 # Deploy in 2 AZs
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10) # 10.0.10.0/24, 10.0.11.0/24
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "infiniteai-private-subnet-${count.index + 1}"
    Project     = "infiniteai-banking"
    Environment = "production"
    Tier        = "Private"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat_gateway_eip" {
  count = 2 # One EIP per NAT Gateway
  vpc   = true

  tags = {
    Name        = "infiniteai-nat-eip-${count.index + 1}"
    Project     = "infiniteai-banking"
    Environment = "production"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

# NAT Gateways (for private subnets to access the internet)
resource "aws_nat_gateway" "main" {
  count         = 2 # One NAT Gateway per public subnet for high availability
  allocation_id = aws_eip.nat_gateway_eip[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name        = "infiniteai-nat-gateway-${count.index + 1}"
    Project     = "infiniteai-banking"
    Environment = "production"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "infiniteai-public-rt"
    Project     = "infiniteai-banking"
    Environment = "production"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

# Associate Public Route Table with Public Subnets
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Table for Private Subnets
resource "aws_route_table" "private" {
  count  = 2 # One private route table per AZ for specific NAT Gateway routing
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name        = "infiniteai-private-rt-${count.index + 1}"
    Project     = "infiniteai-banking"
    Environment = "production"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

# Associate Private Route Table with Private Subnets
resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

################################################################################
# Security Groups - Enforcing Zero Trust Mandate (Covenant 36)
# Default Deny: All ingress/egress is denied unless explicitly allowed.
# Least Privilege: Only necessary ports/protocols/sources are permitted.
################################################################################

# Default Security Group (highly restrictive)
resource "aws_security_group" "default_deny" {
  name        = "infiniteai-default-deny-sg"
  description = "Default deny all traffic - Zero Trust Mandate (Covenant 36)"
  vpc_id      = aws_vpc.main.id

  # No ingress rules by default
  # No egress rules by default

  tags = {
    Name        = "infiniteai-default-deny-sg"
    Project     = "infiniteai-banking"
    Environment = "production"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

# Security Group for Public Load Balancers
resource "aws_security_group" "public_lb" {
  name        = "infiniteai-public-lb-sg"
  description = "Allow HTTP/HTTPS from internet to public load balancers - Zero Trust Mandate (Covenant 36)"
  vpc_id      = aws_vpc.main.id

  # Ingress: Allow HTTP from anywhere
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP from internet"
  }

  # Ingress: Allow HTTPS from anywhere
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS from internet"
  }

  # Egress: Allow outbound to private application servers (on app ports)
  # This will be refined when application SGs are defined, for now allow all outbound
  # to allow for health checks and initial setup.
  # For true Zero Trust, this should be restricted to specific application SGs.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound (will be restricted to app SGs)"
  }

  tags = {
    Name        = "infiniteai-public-lb-sg"
    Project     = "infiniteai-banking"
    Environment = "production"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

# Security Group for Application Servers
resource "aws_security_group" "app_servers" {
  name        = "infiniteai-app-servers-sg"
  description = "Allow traffic from public load balancers to app servers - Zero Trust Mandate (Covenant 36)"
  vpc_id      = aws_vpc.main.id

  # Ingress: Allow traffic from public load balancers on application ports (e.g., 8080)
  ingress {
    from_port       = 8080 # Example application port
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.public_lb.id]
    description     = "Allow app traffic from public LB"
  }

  # Ingress: Allow SSH from a specific bastion host SG or IP range (for management)
  # For Zero Trust, this should NOT be 0.0.0.0/0
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"] # Example: Allow SSH from within VPC (e.g., bastion host)
    description = "Allow SSH from internal network (e.g., bastion)"
  }

  # Egress: Allow outbound to database servers (on DB ports)
  egress {
    from_port       = 5432 # Example PostgreSQL port
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.database_servers.id]
    description     = "Allow outbound to database servers"
  }

  # Egress: Allow outbound to internet for updates/external APIs (via NAT Gateway)
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS outbound for updates/APIs"
  }
  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP outbound for updates/APIs"
  }

  tags = {
    Name        = "infiniteai-app-servers-sg"
    Project     = "infiniteai-banking"
    Environment = "production"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

# Security Group for Database Servers
resource "aws_security_group" "database_servers" {
  name        = "infiniteai-database-servers-sg"
  description = "Allow traffic from application servers to database servers - Zero Trust Mandate (Covenant 36)"
  vpc_id      = aws_vpc.main.id

  # Ingress: Allow traffic from application servers on database ports (e.g., 5432 for PostgreSQL)
  ingress {
    from_port       = 5432 # Example PostgreSQL port
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_servers.id]
    description     = "Allow DB traffic from app servers"
  }

  # Egress: Restrict outbound traffic. Typically, databases should have minimal outbound access.
  # Allow only necessary outbound for patches, monitoring, or specific external services.
  # For Zero Trust, this should be highly specific.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # Temporarily allow all, but should be restricted
    description = "Highly restricted egress (to be refined)"
  }

  tags = {
    Name        = "infiniteai-database-servers-sg"
    Project     = "infiniteai-banking"
    Environment = "production"
    Mandate     = "ZeroTrust-Covenant36"
  }
}

# Output VPC and Subnet IDs for use in other modules
output "vpc_id" {
  description = "The ID of the main VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "public_lb_security_group_id" {
  description = "The ID of the security group for public load balancers"
  value       = aws_security_group.public_lb.id
}

output "app_servers_security_group_id" {
  description = "The ID of the security group for application servers"
  value       = aws_security_group.app_servers.id
}

output "database_servers_security_group_id" {
  description = "The ID of the security group for database servers"
  value       = aws_security_group.database_servers.id
}