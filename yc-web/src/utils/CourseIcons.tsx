import {
    Code2,
    Database,
    Cpu,
    Globe,
    Terminal,
    Brain,
    Layout,
    Server,
    Smartphone,
    Cloud,
    Shield,
    FileCode,
    Braces,
    Coffee,
    Hash,
    Boxes,
    Network,
    Container,
    Calculator,
    Atom
} from "lucide-react";

interface IconConfig {
    Icon: React.ElementType;
    bg: string;
    text: string; // usually white or matching shade
    gradient?: string; // for cases needing gradient
}

// Atom wrapper not strictly needed if we import Atom from lucide (it exists)
const AtomIcon = Atom || Cpu;

interface IconRule {
    keywords?: string[];
    category?: string[];
    config: IconConfig;
    priority?: number; // Higher number = higher priority
}

const DATABASE_CONFIG: IconConfig = { Icon: Database, bg: "bg-emerald-600", text: "text-white", gradient: "from-emerald-600 to-teal-600" };

const ICON_MAPPINGS: IconRule[] = [
    // --- High Priority Overrides (Category based) ---
    {
        category: ["database", "sql", "databases"],
        config: DATABASE_CONFIG,
        priority: 10
    },

    // --- Language Specific ---
    {
        keywords: ["python"],
        config: { Icon: Hash, bg: "bg-blue-500", text: "text-white", gradient: "from-blue-500 to-yellow-500" }
    },
    {
        keywords: ["java"],
        config: { Icon: Coffee, bg: "bg-orange-600", text: "text-white", gradient: "from-orange-600 to-red-600" }
    },
    {
        keywords: ["javascript", "js", "node"],
        config: { Icon: FileCode, bg: "bg-yellow-500", text: "text-white", gradient: "from-yellow-400 to-orange-500" }
    },
    {
        keywords: ["c++", "cpp"],
        config: { Icon: Code2, bg: "bg-blue-700", text: "text-white", gradient: "from-blue-700 to-blue-900" }
    },
    {
        keywords: ["react", "frontend"],
        config: { Icon: AtomIcon, bg: "bg-cyan-500", text: "text-white", gradient: "from-cyan-500 to-blue-500" }
    },
    {
        keywords: ["html", "css", "web"],
        config: { Icon: Globe, bg: "bg-orange-500", text: "text-white", gradient: "from-orange-500 to-red-500" }
    },

    // --- Domain Specific ---
    {
        keywords: ["data structure", "algorithm", "dsa"],
        config: { Icon: Network, bg: "bg-purple-600", text: "text-white", gradient: "from-purple-600 to-indigo-600" }
    },
    {
        keywords: ["machine learning", "ai", "artificial"],
        config: { Icon: Brain, bg: "bg-rose-500", text: "text-white", gradient: "from-rose-500 to-pink-600" }
    },
    {
        keywords: ["cloud", "aws", "devops"],
        config: { Icon: Container, bg: "bg-sky-500", text: "text-white", gradient: "from-sky-500 to-indigo-500" }
    },
    {
        keywords: ["security", "cyber", "hac"],
        config: { Icon: Shield, bg: "bg-slate-800", text: "text-white", gradient: "from-slate-800 to-black" }
    },
    {
        keywords: ["mobile", "flutter", "android", "ios"],
        config: { Icon: Smartphone, bg: "bg-indigo-500", text: "text-white", gradient: "from-indigo-500 to-purple-500" }
    },
    {
        keywords: ["backend", "server", "api"],
        config: { Icon: Server, bg: "bg-slate-600", text: "text-white", gradient: "from-slate-600 to-slate-800" }
    },

    // --- Category Fallbacks ---
    {
        category: ["programming"],
        config: { Icon: Terminal, bg: "bg-blue-600", text: "text-white" }
    },
    {
        category: ["fundamental"],
        config: { Icon: Boxes, bg: "bg-indigo-500", text: "text-white" }
    },
    {
        category: ["math"],
        config: { Icon: Calculator, bg: "bg-red-500", text: "text-white" }
    }
];

const DEFAULT_CONFIG: IconConfig = { Icon: Code2, bg: "bg-gray-500", text: "text-white", gradient: "from-gray-500 to-gray-700" };

// Helper to get consistent color/icon based on course content
export const getCourseIconConfig = (title: string, category?: string): IconConfig => {
    const t = title.toLowerCase();
    const c = (category || "").toLowerCase();

    // 1. Check for High Priority Category Rules
    const categoryRule = ICON_MAPPINGS.find(rule =>
        rule.priority && rule.category && rule.category.some(cat => c.includes(cat))
    );
    if (categoryRule) return categoryRule.config;

    // 2. Check for Keyword Rules in Title
    const keywordRule = ICON_MAPPINGS.find(rule =>
        rule.keywords && rule.keywords.some(k => t.includes(k))
    );
    if (keywordRule) return keywordRule.config;

    // 3. Check for Generic Category Rules
    const genericCategoryRule = ICON_MAPPINGS.find(rule =>
        !rule.priority && rule.category && rule.category.some(cat => c.includes(cat))
    );
    if (genericCategoryRule) return genericCategoryRule.config;

    // 4. Fallback
    return DEFAULT_CONFIG;
};
