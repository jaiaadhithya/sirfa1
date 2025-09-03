# RAM Role for Function Compute
resource "alicloud_ram_role" "fc_role" {
  name        = "sirfa-fc-role-${var.environment}"
  document    = <<EOF
{
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "fc.aliyuncs.com"
        ]
      }
    }
  ],
  "Version": "1"
}
EOF
  description = "RAM role for SIRFA Function Compute service"
  force       = true
}

# RAM Policy for Function Compute
resource "alicloud_ram_policy" "fc_policy" {
  policy_name     = "sirfa-fc-policy-${var.environment}"
  policy_document = <<EOF
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "log:PostLogStoreLogs",
        "log:CreateLogGroup",
        "log:CreateLogStream",
        "log:PutLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "oss:GetObject",
        "oss:PutObject",
        "oss:DeleteObject",
        "oss:ListObjects"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDatabases"
      ],
      "Resource": "*"
    }
  ]
}
EOF
  description     = "Policy for SIRFA Function Compute service"
  force           = true
}

# Attach policy to role
resource "alicloud_ram_role_policy_attachment" "fc_policy_attachment" {
  policy_name = alicloud_ram_policy.fc_policy.policy_name
  policy_type = alicloud_ram_policy.fc_policy.type
  role_name   = alicloud_ram_role.fc_role.name
}

# RAM Role for ECS Instance
resource "alicloud_ram_role" "ecs_role" {
  name        = "sirfa-ecs-role-${var.environment}"
  document    = <<EOF
{
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "ecs.aliyuncs.com"
        ]
      }
    }
  ],
  "Version": "1"
}
EOF
  description = "RAM role for SIRFA ECS instances"
  force       = true
}

# RAM Policy for ECS Instance
resource "alicloud_ram_policy" "ecs_policy" {
  policy_name     = "sirfa-ecs-policy-${var.environment}"
  policy_document = <<EOF
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "fc:InvokeFunction",
        "fc:GetFunction",
        "fc:ListFunctions"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "oss:GetObject",
        "oss:PutObject",
        "oss:DeleteObject",
        "oss:ListObjects"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "log:PostLogStoreLogs",
        "log:CreateLogGroup",
        "log:CreateLogStream",
        "log:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
EOF
  description     = "Policy for SIRFA ECS instances"
  force           = true
}

# Attach policy to ECS role
resource "alicloud_ram_role_policy_attachment" "ecs_policy_attachment" {
  policy_name = alicloud_ram_policy.ecs_policy.policy_name
  policy_type = alicloud_ram_policy.ecs_policy.type
  role_name   = alicloud_ram_role.ecs_role.name
}

# Instance Profile for ECS
resource "alicloud_ecs_instance_profile" "sirfa_profile" {
  instance_profile_name = "sirfa-instance-profile-${var.environment}"
  role_name            = alicloud_ram_role.ecs_role.name
}