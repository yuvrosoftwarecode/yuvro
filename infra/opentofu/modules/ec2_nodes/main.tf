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

data "aws_iam_role" "app_node_existing" {
  name = "${var.environment}-app-node-role"
}

resource "aws_iam_role" "app_node" {
  count = try(data.aws_iam_role.app_node_existing.arn, null) != null ? 0 : 1
  name = "${var.environment}-app-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  lifecycle {
    ignore_changes = [assume_role_policy]
  }
}

locals {
  app_node_role_id   = try(data.aws_iam_role.app_node_existing.id, aws_iam_role.app_node[0].id)
  app_node_role_name = try(data.aws_iam_role.app_node_existing.name, aws_iam_role.app_node[0].name)
}

resource "aws_iam_role_policy_attachment" "app_node_ssm" {
  role       = local.app_node_role_name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "app_node" {
  name = "${var.environment}-app-node-profile"
  role = local.app_node_role_name
}

resource "aws_instance" "app_node" {
  count                  = var.instance_count
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_ids[count.index % length(var.subnet_ids)]
  iam_instance_profile   = aws_iam_instance_profile.app_node.name
  vpc_security_group_ids = [var.security_group_id]
  key_name               = var.key_pair_name

  root_block_device {
    volume_type           = var.root_volume_type
    volume_size           = var.root_volume_size
    delete_on_termination = true
    encrypted             = true
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    environment = var.environment
  }))

  monitoring = true

  tags = {
    Name = "${var.environment}-app-node-${count.index + 1}"
    Role = "app-node"
  }

  lifecycle {
    ignore_changes = [ami]
  }
}

# Elastic IP — static public address, persists across instance stop/start/replace.
# DNS A records must point to this IP.
resource "aws_eip" "app_node" {
  count  = var.instance_count
  domain = "vpc"

  tags = {
    Name = "${var.environment}-app-node-eip-${count.index + 1}"
  }
}

resource "aws_eip_association" "app_node" {
  count         = var.instance_count
  instance_id   = aws_instance.app_node[count.index].id
  allocation_id = aws_eip.app_node[count.index].id
}
