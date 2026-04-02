data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_iam_instance_profile" "kubernetes_node" {
  name = "${var.environment}-kubernetes-node-profile"
  role = aws_iam_role.kubernetes_node.name
}

resource "aws_iam_role" "kubernetes_node" {
  name = "${var.environment}-kubernetes-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "kubernetes_node_ssm" {
  role       = aws_iam_role.kubernetes_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "kubernetes_node_ecr" {
  role       = aws_iam_role.kubernetes_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy" "kubernetes_node_custom" {
  name = "${var.environment}-kubernetes-node-policy"
  role = aws_iam_role.kubernetes_node.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeTags",
          "ec2:DescribeVolumes",
          "ec2:DescribeSnapshots"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_instance" "kubernetes_node" {
  count                = var.instance_count
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = var.instance_type
  subnet_id            = var.subnet_ids[count.index % length(var.subnet_ids)]
  iam_instance_profile = aws_iam_instance_profile.kubernetes_node.name
  security_groups      = [var.security_group_id]
  key_name             = var.key_pair_name

  root_block_device {
    volume_type           = var.root_volume_type
    volume_size           = var.root_volume_size
    delete_on_termination = true
    encrypted             = true
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    kubernetes_version = var.kubernetes_version
    environment        = var.environment
  }))

  monitoring = true

  tags = {
    Name = "${var.environment}-kubernetes-node-${count.index + 1}"
    Role = "kubernetes-node"
  }

  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_ec2_tag" "kubernetes_node_cluster" {
  count       = var.instance_count
  resource_id = aws_instance.kubernetes_node[count.index].id
  key         = "kubernetes.io/cluster/${var.environment}"
  value       = "owned"
}
