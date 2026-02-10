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
    Coffee, // Keeping as fallback or generic
    Hash,
    Boxes,
    Network,
    Container,
    Calculator,
    Atom
} from "lucide-react";

import {
    FaHtml5,
    FaCss3Alt,
    FaJs,
    FaReact,
    FaPython,
    FaJava,
    FaDocker,
    FaAws,
    FaAndroid
} from "react-icons/fa";

import {
    SiCplusplus,
    SiMysql,
    SiPostgresql,
    SiMongodb,
    SiTypescript,
    SiFlutter,
    SiKotlin,
    SiSwift,
    SiSpringboot,
    SiDjango,
    SiKubernetes
} from "react-icons/si";

interface IconConfig {
    Icon: React.ElementType;
    bg: string;
    text: string;
    gradient?: string;
}

const AtomIcon = Atom || Cpu;

interface IconRule {
    keywords?: string[];
    category?: string[];
    config: IconConfig;
    priority?: number;
}

// Special Database Config using Lucide Database for generic 'database' category
const DATABASE_CONFIG: IconConfig = { Icon: Database, bg: "bg-emerald-600", text: "text-white", gradient: "from-emerald-600 to-teal-600" };

const ICON_MAPPINGS: IconRule[] = [
    // --- High Priority Overrides (Category based) ---
    {
        category: ["database", "sql", "databases"],
        config: DATABASE_CONFIG,
        priority: 10
    },

    // --- Language / Framework Specific (Brand Logos) ---
    {
        keywords: ["html"],
        config: { Icon: FaHtml5, bg: "bg-orange-500", text: "text-white", gradient: "from-orange-500 to-red-600" }
    },
    {
        keywords: ["css"],
        config: { Icon: FaCss3Alt, bg: "bg-blue-600", text: "text-white", gradient: "from-blue-600 to-indigo-600" }
    },
    {
        keywords: ["javascript", "js", "ecmascript"],
        config: { Icon: FaJs, bg: "bg-yellow-400", text: "text-white", gradient: "from-yellow-400 to-yellow-500" }
    },
    {
        keywords: ["typescript", "ts"],
        config: { Icon: SiTypescript, bg: "bg-blue-600", text: "text-white", gradient: "from-blue-600 to-blue-700" }
    },
    {
        keywords: ["react"],
        config: { Icon: FaReact, bg: "bg-cyan-500", text: "text-white", gradient: "from-cyan-500 to-blue-500" }
    },
    {
        keywords: ["python"],
        config: { Icon: FaPython, bg: "bg-blue-500", text: "text-white", gradient: "from-blue-500 to-yellow-500" }
    },
    {
        keywords: ["java"],
        config: { Icon: FaJava, bg: "bg-red-600", text: "text-white", gradient: "from-red-600 to-orange-600" }
    },
    {
        keywords: ["c++", "cpp"],
        config: { Icon: SiCplusplus, bg: "bg-blue-700", text: "text-white", gradient: "from-blue-700 to-blue-900" }
    },
    {
        keywords: ["spring"],
        config: { Icon: SiSpringboot, bg: "bg-green-500", text: "text-white", gradient: "from-green-500 to-emerald-600" }
    },
    {
        keywords: ["django"],
        config: { Icon: SiDjango, bg: "bg-green-800", text: "text-white", gradient: "from-green-800 to-green-900" }
    },

    // --- Mobile ---
    {
        keywords: ["android"],
        config: { Icon: FaAndroid, bg: "bg-green-500", text: "text-white", gradient: "from-green-500 to-emerald-500" }
    },
    {
        keywords: ["flutter"],
        config: { Icon: SiFlutter, bg: "bg-cyan-500", text: "text-white", gradient: "from-cyan-500 to-blue-500" }
    },
    {
        keywords: ["ios", "swift"],
        config: { Icon: SiSwift, bg: "bg-orange-500", text: "text-white", gradient: "from-orange-500 to-red-500" }
    },
    {
        keywords: ["kotlin"],
        config: { Icon: SiKotlin, bg: "bg-purple-500", text: "text-white", gradient: "from-purple-500 to-pink-500" }
    },

    // --- Cloud & DevOps ---
    {
        keywords: ["aws"],
        config: { Icon: FaAws, bg: "bg-orange-400", text: "text-white", gradient: "from-orange-400 to-orange-600" }
    },
    {
        keywords: ["docker", "container"],
        config: { Icon: FaDocker, bg: "bg-blue-500", text: "text-white", gradient: "from-blue-500 to-cyan-500" }
    },
    {
        keywords: ["kubernetes", "k8s"],
        config: { Icon: SiKubernetes, bg: "bg-blue-600", text: "text-white", gradient: "from-blue-600 to-indigo-600" }
    },
    {
        keywords: ["cloud", "devops"],
        config: { Icon: Cloud, bg: "bg-sky-500", text: "text-white", gradient: "from-sky-500 to-blue-500" }
    },

    // --- Domain Specific Fallbacks ---
    {
        keywords: ["data structure", "algorithm", "dsa"],
        config: { Icon: Network, bg: "bg-purple-600", text: "text-white", gradient: "from-purple-600 to-indigo-600" }
    },
    {
        keywords: ["machine learning", "ai", "artificial"],
        config: { Icon: Brain, bg: "bg-rose-500", text: "text-white", gradient: "from-rose-500 to-pink-600" }
    },
    {
        keywords: ["security", "cyber", "hac"],
        config: { Icon: Shield, bg: "bg-slate-800", text: "text-white", gradient: "from-slate-800 to-black" }
    },

    // --- General Web ---
    {
        keywords: ["web", "frontend", "backend", "fullstack"],
        config: { Icon: Globe, bg: "bg-indigo-500", text: "text-white", gradient: "from-indigo-500 to-purple-500" }
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
