variable "project_name" {
  description = "Prefix used for AWS resource names."
  type        = string
  default     = "cloud-webapp"
}

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs across two availability zones."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs across two availability zones."
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "ssh_cidr" {
  description = "CIDR range allowed to SSH into the EC2 instance."
  type        = string
  default     = "0.0.0.0/0"
}

variable "enable_ssh" {
  description = "Whether to open port 22 to the ssh_cidr range."
  type        = bool
  default     = false
}

variable "instance_type" {
  description = "EC2 instance type for the web application."
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Optional EC2 key pair name for SSH access."
  type        = string
  default     = null
}

variable "app_port" {
  description = "Port used by the Node.js application on the EC2 instance."
  type        = number
  default     = 3000
}

variable "app_repo_url" {
  description = "Git repository URL cloned by EC2 user data."
  type        = string
}

variable "app_branch" {
  description = "Git branch deployed on the EC2 instance."
  type        = string
  default     = "main"
}

variable "db_name" {
  description = "Application database name."
  type        = string
  default     = "appdb"
}

variable "db_username" {
  description = "Master username for PostgreSQL."
  type        = string
  default     = "appuser"
}

variable "db_password" {
  description = "Deprecated. Ignored because RDS now manages the master password in Secrets Manager."
  type        = string
  default     = null
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated RDS storage in GB."
  type        = number
  default     = 20
}

variable "db_backup_retention_period" {
  description = "How many days to retain automated RDS backups."
  type        = number
  default     = 7
}

variable "db_deletion_protection" {
  description = "Protect the RDS instance from accidental deletion."
  type        = bool
  default     = true
}

variable "cpu_alarm_threshold" {
  description = "CPU percentage that triggers the CloudWatch alarm."
  type        = number
  default     = 70
}

variable "alarm_email" {
  description = "Optional email subscription for the CloudWatch SNS topic."
  type        = string
  default     = null
}

variable "static_bucket_public_read" {
  description = "Allow public read access to uploaded static files."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Extra tags applied to created resources."
  type        = map(string)
  default     = {}
}
