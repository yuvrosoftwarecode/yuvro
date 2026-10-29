const DEVICON_BASE = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

const ICON_MAP: { keywords: string[]; path: string }[] = [
  // Absolute paths (leading "/") are served from ylabs-web/public.
  { keywords: ["llm", "large language model"], path: "/icons/llm.svg" },
  { keywords: ["fastapi"], path: "fastapi/fastapi-original.svg" },
  { keywords: ["flask"], path: "flask/flask-original.svg" },
  {
    keywords: ["python", "django", "pytorch", "numpy", "pandas"],
    path: "python/python-original.svg",
  },
  { keywords: ["java", "spring", "kotlin"], path: "java/java-original.svg" },
  { keywords: ["kotlin"], path: "kotlin/kotlin-original.svg" },
  {
    keywords: ["javascript", "js", "node", "express", "nestjs"],
    path: "javascript/javascript-original.svg",
  },
  { keywords: ["typescript", "ts"], path: "typescript/typescript-original.svg" },
  { keywords: ["react", "reactjs", "react native"], path: "react/react-original.svg" },
  { keywords: ["nextjs", "next.js", "next js"], path: "nextjs/nextjs-original.svg" },
  { keywords: ["vue", "vuejs", "nuxt"], path: "vuejs/vuejs-original.svg" },
  { keywords: ["angular"], path: "angularjs/angularjs-original.svg" },
  { keywords: ["rust"], path: "rust/rust-plain.svg" },
  { keywords: ["go", "golang"], path: "go/go-original.svg" },
  { keywords: ["c#", "csharp", "dotnet", ".net"], path: "csharp/csharp-original.svg" },
  { keywords: ["c++", "cpp"], path: "cplusplus/cplusplus-original.svg" },
  { keywords: [" c "], path: "c/c-original.svg" },
  { keywords: ["swift"], path: "swift/swift-original.svg" },
  { keywords: ["ruby", "rails"], path: "ruby/ruby-original.svg" },
  { keywords: ["php", "laravel"], path: "php/php-original.svg" },
  { keywords: ["scala"], path: "scala/scala-original.svg" },

  { keywords: ["postgresql", "postgres"], path: "postgresql/postgresql-original.svg" },
  { keywords: ["mysql"], path: "mysql/mysql-original.svg" },
  { keywords: ["mongodb", "mongo"], path: "mongodb/mongodb-original.svg" },
  { keywords: ["redis"], path: "redis/redis-original.svg" },
  { keywords: ["sqlite"], path: "sqlite/sqlite-original.svg" },
  { keywords: ["elasticsearch"], path: "elasticsearch/elasticsearch-original.svg" },
  { keywords: ["cassandra"], path: "cassandra/cassandra-original.svg" },
  { keywords: ["neo4j"], path: "neo4j/neo4j-original.svg" },
  { keywords: ["database", "sql", "db"], path: "postgresql/postgresql-original.svg" },

  { keywords: ["docker"], path: "docker/docker-original.svg" },
  { keywords: ["kubernetes", "k8s"], path: "kubernetes/kubernetes-plain.svg" },
  {
    keywords: ["aws", "amazon web services", "ec2", "s3 bucket", "lambda"],
    path: "amazonwebservices/amazonwebservices-original-wordmark.svg",
  },
  { keywords: ["azure"], path: "azure/azure-original.svg" },
  { keywords: ["gcp", "google cloud"], path: "googlecloud/googlecloud-original.svg" },
  {
    keywords: ["linux", "bash", "shell", "terminal", "unix", "ubuntu"],
    path: "linux/linux-original.svg",
  },
  { keywords: ["git", "github", "gitlab"], path: "git/git-original.svg" },
  { keywords: ["nginx", "web server"], path: "nginx/nginx-original.svg" },
  { keywords: ["ansible"], path: "ansible/ansible-original.svg" },
  { keywords: ["terraform"], path: "terraform/terraform-original.svg" },
  { keywords: ["jenkins"], path: "jenkins/jenkins-original.svg" },
  { keywords: ["devops", "ci/cd", "pipeline"], path: "docker/docker-original.svg" },

  { keywords: ["html", "webpage", "web page"], path: "html5/html5-original.svg" },
  { keywords: ["css", "sass", "tailwind"], path: "css3/css3-original.svg" },
  { keywords: ["webpack", "vite", "rollup"], path: "webpack/webpack-original.svg" },
  { keywords: ["flutter", "dart"], path: "flutter/flutter-original.svg" },

  {
    keywords: ["selenium", "testing", "quality", "qa", "playwright", "jest", "pytest"],
    path: "selenium/selenium-original.svg",
  },

  {
    keywords: [
      "machine learning",
      "ai",
      "artificial intelligence",
      "deep learning",
      "tensorflow",
      "keras",
    ],
    path: "tensorflow/tensorflow-original.svg",
  },
  { keywords: ["data science", "data analysis", "jupyter"], path: "jupyter/jupyter-original.svg" },

  { keywords: ["backend", "api", "rest", "graphql"], path: "nodejs/nodejs-original.svg" },
  { keywords: ["frontend", "ui", "interface"], path: "html5/html5-original.svg" },
  {
    keywords: ["full stack", "fullstack", "full-stack"],
    path: "javascript/javascript-original.svg",
  },
];

export function getLabIconUrl(name: string): string | null {
  const lower = ` ${name.toLowerCase()} `;
  for (const { keywords, path } of ICON_MAP) {
    if (keywords.some((k) => lower.includes(k))) {
      if (path.startsWith("/")) {
        return path;
      }
      return `${DEVICON_BASE}/${path}`;
    }
  }
  return null;
}
