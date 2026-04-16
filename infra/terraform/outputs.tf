output "ec2_public_ip" {
  description = "Public IP of the EC2 instance."
  value       = aws_instance.web.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS name of the EC2 instance."
  value       = aws_instance.web.public_dns
}

output "application_url" {
  description = "Base URL of the deployed application."
  value       = "http://${aws_instance.web.public_dns}"
}

output "rds_endpoint" {
  description = "PostgreSQL endpoint used by the application."
  value       = aws_db_instance.main.address
}

output "rds_master_secret_arn" {
  description = "Secrets Manager ARN containing the managed RDS master password."
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "static_bucket_name" {
  description = "S3 bucket storing static files."
  value       = aws_s3_bucket.static_assets.bucket
}

output "static_bucket_url" {
  description = "Public URL prefix for static files when public read is enabled."
  value       = var.static_bucket_public_read ? "https://${aws_s3_bucket.static_assets.bucket}.s3.${var.aws_region}.amazonaws.com" : null
}

output "cloudwatch_alarm_name" {
  description = "Name of the EC2 CPU CloudWatch alarm."
  value       = aws_cloudwatch_metric_alarm.cpu_high.alarm_name
}
