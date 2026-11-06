// Component catalog for the System Design Studio canvas.
export type SDItem = { kind: string; label: string; icon: string; tag?: string };
export type SDGroup = { group: string; items: SDItem[] };

const g = (group: string, tag: string | undefined, items: [string, string, string][]): SDGroup => ({
  group,
  items: items.map(([kind, label, icon]) => ({ kind, label, icon, tag })),
});

export const SD_PALETTE: SDGroup[] = [
  g("Clients & Users", undefined, [
    ["user", "User / Actor", "👤"], ["web", "Web Client", "🖥️"], ["mobile", "Mobile App", "📱"],
    ["desktop", "Desktop App", "💻"], ["iot", "IoT Device", "📟"], ["admin", "Admin Portal", "🛡️"],
    ["thirdparty", "Third-party Client", "🤝"], ["browser-ext", "Browser Extension", "🧩"],
  ]),
  g("Networking & Edge", undefined, [
    ["dns", "DNS", "🌐"], ["cdn", "CDN", "🛰️"], ["lb", "Load Balancer", "⚖️"], ["gateway", "API Gateway", "🚪"],
    ["proxy", "Reverse Proxy", "🔁"], ["waf", "WAF / Firewall", "🧱"], ["vpn", "VPN", "🔒"], ["nat", "NAT Gateway", "🔀"],
    ["mesh", "Service Mesh", "🕸️"], ["ratelimit", "Rate Limiter", "⏱️"], ["websocket", "WebSocket Server", "🔌"],
  ]),
  g("Compute & Services", undefined, [
    ["service", "Microservice", "⚙️"], ["monolith", "Monolith App", "🏢"], ["worker", "Background Worker", "🛠️"],
    ["lambda", "Serverless Function", "λ"], ["cron", "Cron / Scheduler", "⏰"], ["vm", "Virtual Machine", "🖧"],
    ["bff", "BFF", "🧭"], ["graphql", "GraphQL Server", "◈"], ["grpc", "gRPC Service", "📡"],
    ["notify", "Notification Service", "🔔"], ["payment", "Payment Service", "💳"], ["email", "Email Service", "✉️"],
    ["idgen", "ID Generator", "#️⃣"], ["workflow", "Workflow Engine", "🔄"],
  ]),
  g("Containers & Orchestration", undefined, [
    ["docker", "Container", "🐳"], ["k8s", "Kubernetes Cluster", "☸️"], ["pod", "Pod", "🫛"],
    ["registry", "Container Registry", "📦"], ["helm", "Helm Chart", "⎈"], ["nomad", "Nomad", "🧳"],
  ]),
  g("Databases", undefined, [
    ["postgres", "PostgreSQL", "🐘"], ["mysql", "MySQL", "🐬"], ["sql", "SQL DB (generic)", "🗄️"],
    ["mongo", "MongoDB", "🍃"], ["cassandra", "Cassandra", "👁️"], ["dynamo", "Key-Value Store", "🔑"],
    ["graphdb", "Graph DB (Neo4j)", "🔗"], ["timeseries", "Time-series DB", "📉"], ["vector", "Vector DB", "🧬"],
    ["replica", "Read Replica", "🪞"], ["shard", "DB Shard", "🧩"], ["newsql", "CockroachDB / Spanner", "🪳"],
  ]),
  g("Caching", undefined, [
    ["redis", "Redis", "⚡"], ["memcached", "Memcached", "💾"], ["localcache", "In-memory Cache", "🧠"],
  ]),
  g("Storage", undefined, [
    ["blob", "Object Storage", "🪣"], ["fs", "File System / NFS", "📁"], ["block", "Block Storage", "🧱"],
    ["archive", "Cold Archive", "🧊"], ["datalake", "Data Lake", "🏞️"],
  ]),
  g("Messaging & Streaming", undefined, [
    ["queue", "Message Queue", "📬"], ["kafka", "Kafka", "🌊"], ["rabbit", "RabbitMQ", "🐇"],
    ["pubsub", "Pub/Sub", "📣"], ["eventbus", "Event Bus", "🚌"], ["dlq", "Dead Letter Queue", "☠️"],
    ["stream", "Stream Processor", "🌀"],
  ]),
  g("Search & Analytics", undefined, [
    ["elastic", "Elasticsearch", "🔎"], ["warehouse", "Data Warehouse", "🏛️"], ["etl", "ETL Pipeline", "🚰"],
    ["spark", "Spark / Batch Job", "✨"], ["bi", "BI Dashboard", "📊"], ["clickhouse", "OLAP (ClickHouse)", "🟨"],
  ]),
  g("AI / ML", undefined, [
    ["llm", "LLM API", "🤖"], ["model", "ML Model Server", "🧠"], ["feature", "Feature Store", "🗃️"],
    ["training", "Training Pipeline", "🏋️"], ["embedding", "Embedding Service", "🧬"], ["recommender", "Recommender", "🎯"],
  ]),
  g("Security & Identity", undefined, [
    ["auth", "Auth Service", "🔐"], ["oauth", "OAuth / SSO", "🪪"], ["iam", "IAM", "👮"],
    ["secrets", "Secrets Manager", "🗝️"], ["kms", "KMS / HSM", "🔏"], ["ddos", "DDoS Protection", "🛡️"],
  ]),
  g("Observability", undefined, [
    ["monitor", "Monitoring", "📈"], ["logs", "Logging", "🧾"], ["tracing", "Tracing", "🧵"],
    ["alert", "Alerting / PagerDuty", "🚨"], ["prometheus", "Prometheus", "🔥"], ["grafana", "Grafana", "📊"],
  ]),
  g("DevOps & CI/CD", undefined, [
    ["git", "Git Repo", "🌿"], ["ci", "CI Pipeline", "🏗️"], ["cd", "CD / Deploy", "🚀"],
    ["iac", "Terraform / IaC", "🧱"], ["flags", "Feature Flags", "🚩"], ["artifact", "Artifact Store", "📦"],
  ]),
  g("External & SaaS", undefined, [
    ["stripe", "Stripe", "💳"], ["twilio", "Twilio / SMS", "💬"], ["sendgrid", "SendGrid", "📧"],
    ["maps", "Maps API", "🗺️"], ["slack", "Slack Webhook", "💼"], ["extapi", "External API", "🌍"],
  ]),
  g("AWS", "AWS", [
    ["aws-ec2", "EC2", "🖧"], ["aws-lambda", "Lambda", "λ"], ["aws-ecs", "ECS / Fargate", "🐳"], ["aws-eks", "EKS", "☸️"],
    ["aws-s3", "S3", "🪣"], ["aws-rds", "RDS / Aurora", "🗄️"], ["aws-dynamo", "DynamoDB", "🔑"], ["aws-elasticache", "ElastiCache", "⚡"],
    ["aws-sqs", "SQS", "📬"], ["aws-sns", "SNS", "📣"], ["aws-kinesis", "Kinesis", "🌊"], ["aws-cloudfront", "CloudFront", "🛰️"],
    ["aws-route53", "Route 53", "🌐"], ["aws-alb", "ALB / ELB", "⚖️"], ["aws-apigw", "API Gateway", "🚪"], ["aws-cognito", "Cognito", "🪪"],
    ["aws-cloudwatch", "CloudWatch", "📈"], ["aws-stepfn", "Step Functions", "🔄"], ["aws-eventbridge", "EventBridge", "🚌"], ["aws-sagemaker", "SageMaker", "🧠"],
  ]),
  g("Google Cloud", "GCP", [
    ["gcp-gce", "Compute Engine", "🖧"], ["gcp-run", "Cloud Run", "🏃"], ["gcp-functions", "Cloud Functions", "λ"], ["gcp-gke", "GKE", "☸️"],
    ["gcp-gcs", "Cloud Storage", "🪣"], ["gcp-sql", "Cloud SQL", "🗄️"], ["gcp-spanner", "Spanner", "🌐"], ["gcp-firestore", "Firestore", "🔥"],
    ["gcp-bigtable", "Bigtable", "🔑"], ["gcp-bigquery", "BigQuery", "🏛️"], ["gcp-pubsub", "Pub/Sub", "📣"], ["gcp-memorystore", "Memorystore", "⚡"],
    ["gcp-lb", "Cloud Load Balancing", "⚖️"], ["gcp-cdn", "Cloud CDN", "🛰️"], ["gcp-vertex", "Vertex AI", "🧠"], ["gcp-dataflow", "Dataflow", "🚰"],
  ]),
  g("Azure", "Azure", [
    ["az-vm", "Virtual Machines", "🖧"], ["az-functions", "Functions", "λ"], ["az-aks", "AKS", "☸️"], ["az-appservice", "App Service", "🌐"],
    ["az-blob", "Blob Storage", "🪣"], ["az-sql", "Azure SQL", "🗄️"], ["az-cosmos", "Cosmos DB", "🪐"], ["az-redis", "Azure Cache for Redis", "⚡"],
    ["az-servicebus", "Service Bus", "🚌"], ["az-eventhubs", "Event Hubs", "🌊"], ["az-frontdoor", "Front Door", "🚪"], ["az-apim", "API Management", "🧭"],
    ["az-entra", "Entra ID", "🪪"], ["az-monitor", "Azure Monitor", "📈"], ["az-openai", "Azure OpenAI", "🤖"],
  ]),
  g("Other Cloud & Platforms", undefined, [
    ["cloudflare", "Cloudflare", "🟠"], ["cf-workers", "Cloudflare Workers", "⚙️"], ["vercel", "Vercel", "▲"],
    ["netlify", "Netlify", "🔷"], ["supabase", "Supabase", "🟢"], ["firebase", "Firebase", "🔥"],
    ["heroku", "Heroku", "🟣"], ["do", "DigitalOcean", "🌊"], ["oci", "Oracle Cloud", "🔴"],
  ]),
  g("Boundaries & Notes", undefined, [
    ["region", "Region", "🗺️"], ["az", "Availability Zone", "🏙️"], ["vpc", "VPC / Subnet", "🏘️"],
    ["note", "Note", "📝"], ["custom", "Custom Component", "⬜"],
  ]),
];
