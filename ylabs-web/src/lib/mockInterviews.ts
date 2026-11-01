export type Category = "Backend" | "Frontend" | "Data" | "DevOps & Cloud" | "System Design" | "AI/ML" | "Security" | "Behavioural";
export const CATEGORIES: Category[] = ["Backend", "Frontend", "Data", "DevOps & Cloud", "System Design", "AI/ML", "Security", "Behavioural"];
export const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;
export type Diff = typeof DIFFICULTIES[number];
export const ROLES = ["Fresher", "SDE I", "SDE II", "Senior"] as const;

export interface Interview {
  slug: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  category: Category;
  difficulty: Diff;
  role: typeof ROLES[number];
  questions: number;
  minutes: number;
  completed: number;
  featured?: boolean;
  backendId?: string;
  predefinedTree?: any;
  requiredSkills?: string[];
  optionalSkills?: string[];
  instructions?: string;
  interviewMode?: string;
  products?: string[];
  mySubmissions?: any[];
  userProgress?: {
    completed_count: number;
    is_master: boolean;
  } | null;
}

export const INTERVIEWS: Interview[] = [
  { slug: "java-backend", name: "Java Backend Engineer", icon: "☕", color: "warning", description: "Core Java, Spring Boot, REST APIs and JVM tuning questions with follow-ups.", category: "Backend", difficulty: "Intermediate", role: "SDE I", questions: 12, minutes: 30, completed: 1, featured: true },
  { slug: "python-django", name: "Python & Django", icon: "🐍", color: "info", description: "ORM, middleware, async views and Python internals.", category: "Backend", difficulty: "Intermediate", role: "SDE I", questions: 10, minutes: 25, completed: 0 },
  { slug: "node-api", name: "Node.js API Developer", icon: "🟩", color: "success", description: "Event loop, streams, Express design and API security.", category: "Backend", difficulty: "Intermediate", role: "SDE II", questions: 10, minutes: 25, completed: 0 },
  { slug: "react-frontend", name: "React Frontend Engineer", icon: "⚛️", color: "info", description: "Hooks, rendering, state management and performance.", category: "Frontend", difficulty: "Intermediate", role: "SDE I", questions: 12, minutes: 30, completed: 0, featured: true },
  { slug: "web-fundamentals", name: "Web Fundamentals", icon: "🌐", color: "primary", description: "HTML, CSS, JavaScript and browser basics for freshers.", category: "Frontend", difficulty: "Beginner", role: "Fresher", questions: 8, minutes: 20, completed: 0 },
  { slug: "sql-data", name: "SQL & Data Analyst", icon: "🗄️", color: "primary", description: "Joins, window functions, indexing and query optimization.", category: "Data", difficulty: "Beginner", role: "Fresher", questions: 10, minutes: 20, completed: 0, featured: true },
  { slug: "data-engineer", name: "Data Engineer", icon: "🔀", color: "warning", description: "Pipelines, Spark, Kafka, warehousing and data modelling.", category: "Data", difficulty: "Advanced", role: "SDE II", questions: 12, minutes: 35, completed: 0 },
  { slug: "devops-k8s", name: "DevOps & Kubernetes", icon: "☸️", color: "info", description: "CI/CD, Docker, Kubernetes, observability and incidents.", category: "DevOps & Cloud", difficulty: "Advanced", role: "SDE II", questions: 12, minutes: 30, completed: 0, featured: true },
  { slug: "aws-cloud", name: "AWS Cloud Engineer", icon: "☁️", color: "warning", description: "VPC, IAM, EC2, Lambda, S3 and cost-aware architecture.", category: "DevOps & Cloud", difficulty: "Intermediate", role: "SDE II", questions: 10, minutes: 30, completed: 0 },
  { slug: "sd-hld", name: "System Design – HLD", icon: "🏛️", color: "primary", description: "Design scalable systems: URL shortener, feeds, payments.", category: "System Design", difficulty: "Advanced", role: "Senior", questions: 6, minutes: 45, completed: 0, featured: true },
  { slug: "sd-lld", name: "System Design – LLD", icon: "🧩", color: "success", description: "Object modelling, design patterns and API contracts.", category: "System Design", difficulty: "Intermediate", role: "SDE II", questions: 6, minutes: 40, completed: 0 },
  { slug: "ml-engineer", name: "ML Engineer", icon: "🤖", color: "info", description: "Model training, evaluation, feature stores and MLOps.", category: "AI/ML", difficulty: "Advanced", role: "SDE II", questions: 10, minutes: 35, completed: 0, featured: true },
  { slug: "genai-llm", name: "GenAI & LLM Apps", icon: "✨", color: "primary", description: "RAG, prompting, embeddings, evals and guardrails.", category: "AI/ML", difficulty: "Intermediate", role: "SDE I", questions: 10, minutes: 30, completed: 0 },
  { slug: "appsec", name: "Application Security", icon: "🛡️", color: "destructive", description: "OWASP Top 10, auth flows, JWT and threat modelling.", category: "Security", difficulty: "Advanced", role: "SDE II", questions: 10, minutes: 30, completed: 0 },
  { slug: "qa-automation", name: "QA Automation", icon: "🧪", color: "success", description: "Test strategy, Selenium/Playwright and flaky tests.", category: "Backend", difficulty: "Beginner", role: "Fresher", questions: 8, minutes: 20, completed: 0 },
  { slug: "behavioural", name: "Behavioural & HR", icon: "🗣️", color: "warning", description: "STAR answers, ownership, conflict and career goals.", category: "Behavioural", difficulty: "Beginner", role: "Fresher", questions: 8, minutes: 20, completed: 0, featured: true },
];
