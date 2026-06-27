export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type Status = "Not Started" | "In Progress" | "Completed";

export interface Ticket {
  id: string;
  title: string;
  difficulty: Difficulty;
  estMin: number;
  xp: number;
  tag: string;
  status: Status;
  progress?: number;
  score?: number;
  description: string;
}

export interface Lab {
  slug: string;
  name: string;
  icon: string;
  color: "java" | "python" | "ui" | "sql";
  difficulty: Difficulty;
  completed: number;
  total: number;
  hoursLeft: number;
  description: string;
  skills: { name: string; pct: number }[];
}

export const labs: Lab[] = [
  { slug: "java", name: "Java Lab", icon: "☕", color: "java", difficulty: "Intermediate", completed: 8, total: 25, hoursLeft: 14, description: "Master Java fundamentals to advanced OOP.", skills: [
    { name: "Core Syntax", pct: 85 }, { name: "OOP Concepts", pct: 65 }, { name: "Exception Handling", pct: 45 }, { name: "Collections", pct: 30 }
  ]},
  { slug: "python", name: "Python Lab", icon: "🐍", color: "python", difficulty: "Beginner", completed: 12, total: 30, hoursLeft: 10, description: "From scripting to data structures and APIs.", skills: [
    { name: "Syntax", pct: 90 }, { name: "Functions", pct: 72 }, { name: "Modules", pct: 55 }, { name: "Async I/O", pct: 25 }
  ]},
  { slug: "ui", name: "UI Lab", icon: "🎨", color: "ui", difficulty: "Intermediate", completed: 5, total: 20, hoursLeft: 18, description: "Build pixel-perfect interfaces with HTML, CSS, React.", skills: [
    { name: "HTML/CSS", pct: 80 }, { name: "Flex/Grid", pct: 70 }, { name: "React", pct: 50 }, { name: "Accessibility", pct: 35 }
  ]},
  { slug: "sql", name: "SQL Lab", icon: "🗄️", color: "sql", difficulty: "Advanced", completed: 3, total: 18, hoursLeft: 22, description: "Queries, joins, window functions, optimization.", skills: [
    { name: "SELECT", pct: 95 }, { name: "JOINs", pct: 60 }, { name: "Windows", pct: 30 }, { name: "Tuning", pct: 15 }
  ]},
];

const mk = (i: number, title: string, diff: Difficulty, st: Status, tag: string, mins = 45, xp = 150, progress?: number, score?: number): Ticket => ({
  id: `JAVA-${100 + i}`, title, difficulty: diff, estMin: mins, xp, tag, status: st, progress, score,
  description: `Implement and test ${title.toLowerCase()}. Focus on clean idiomatic code and edge cases.`,
});

export const tickets: Ticket[] = [
  mk(1, "Variables & Types", "Beginner", "Completed", "Fundamentals", 30, 100, undefined, 95),
  mk(2, "Control Flow", "Beginner", "Completed", "Fundamentals", 35, 120, undefined, 88),
  mk(3, "Arrays & Loops", "Beginner", "Completed", "Fundamentals", 40, 130, undefined, 92),
  mk(4, "Methods & Scope", "Beginner", "Completed", "Fundamentals", 40, 130, undefined, 80),
  mk(5, "Strings Deep Dive", "Beginner", "Completed", "Fundamentals", 45, 150, undefined, 76),
  mk(6, "Classes & Objects", "Intermediate", "Completed", "OOP", 60, 200, undefined, 84),
  mk(7, "Inheritance", "Intermediate", "Completed", "OOP", 55, 200, undefined, 70),
  mk(8, "Interfaces", "Intermediate", "Completed", "OOP", 60, 220, undefined, 65),
  mk(9, "Generics 101", "Intermediate", "In Progress", "Generics", 70, 250, 60),
  mk(10, "Exception Handling", "Intermediate", "In Progress", "Errors", 50, 200, 30),
  mk(11, "File I/O Basics", "Intermediate", "In Progress", "I/O", 60, 220, 10),
  mk(12, "Collections: List", "Intermediate", "Not Started", "Collections", 50, 200),
  mk(13, "Collections: Map", "Intermediate", "Not Started", "Collections", 55, 220),
  mk(14, "Streams API", "Advanced", "Not Started", "Streams", 80, 300),
  mk(15, "Lambdas", "Advanced", "Not Started", "FP", 70, 280),
  mk(16, "Concurrency Intro", "Advanced", "Not Started", "Threads", 90, 350),
  mk(17, "Executors", "Advanced", "Not Started", "Threads", 90, 350),
  mk(18, "JDBC Basics", "Advanced", "Not Started", "DB", 80, 320),
  mk(19, "JUnit Testing", "Intermediate", "Not Started", "Testing", 60, 220),
  mk(20, "Design Patterns I", "Advanced", "Not Started", "Patterns", 100, 400),
];

export const leaderboard = [
  { rank: 1, name: "Aarav S.", xp: 12480, streak: 42, avatar: "AS" },
  { rank: 2, name: "Priya M.", xp: 11820, streak: 30, avatar: "PM" },
  { rank: 3, name: "Liam K.", xp: 10990, streak: 21, avatar: "LK" },
  { rank: 4, name: "Sofia R.", xp: 9870, streak: 14, avatar: "SR" },
  { rank: 5, name: "Noah T.", xp: 9410, streak: 9, avatar: "NT" },
  { rank: 15, name: "You", xp: 4250, streak: 7, avatar: "YO", isYou: true },
];

export const me = {
  name: "Alex Chen",
  handle: "@alexc",
  level: 12,
  xp: 4250,
  nextLevelXp: 5000,
  streak: 7,
  rank: 15,
  totalSolved: 28,
  avatar: "AC",
};

export const forumThreads = [
  { id: 1, title: "Best way to handle null in JAVA-110?", author: "Priya M.", replies: 12, tag: "Java", time: "2h" },
  { id: 2, title: "Python list comprehension vs loop perf", author: "Liam K.", replies: 7, tag: "Python", time: "5h" },
  { id: 3, title: "When should I use INNER vs LEFT join?", author: "Sofia R.", replies: 23, tag: "SQL", time: "1d" },
  { id: 4, title: "Tailwind grid gotchas with auto-fit", author: "Noah T.", replies: 4, tag: "UI", time: "1d" },
];

export const certificates = [
  { id: 1, title: "Java Fundamentals", date: "May 2026", score: 92, color: "java" as const },
  { id: 2, title: "Python Essentials", date: "Apr 2026", score: 88, color: "python" as const },
  { id: 3, title: "SQL Basics", date: "Mar 2026", score: 95, color: "sql" as const },
];
