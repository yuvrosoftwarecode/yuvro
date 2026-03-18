import { Role } from '@/types/mockInterview';

export const getRoleIconConfig = (title: string) => {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('java')) {
        return {
            icon: "☕",
            iconBg: "bg-orange-100 dark:bg-orange-900/30",
            iconColor: "text-orange-600 dark:text-orange-400",
            buttonGradient: "from-orange-600 to-red-600"
        };
    } else if (titleLower.includes('python')) {
        return {
            icon: "🐍",
            iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
            iconColor: "text-yellow-600 dark:text-yellow-400",
            buttonGradient: "from-yellow-600 to-orange-600"
        };
    } else if (titleLower.includes('frontend') || titleLower.includes('react') || titleLower.includes('web')) {
        return {
            icon: "⚛️",
            iconBg: "bg-cyan-100 dark:bg-cyan-900/30",
            iconColor: "text-cyan-600 dark:text-cyan-400",
            buttonGradient: "from-cyan-600 to-blue-600"
        };
    } else if (titleLower.includes('data scientist') || titleLower.includes('data science') || titleLower.includes('ai')) {
        return {
            icon: "📊",
            iconBg: "bg-purple-100 dark:bg-purple-900/30",
            iconColor: "text-purple-600 dark:text-purple-400",
            buttonGradient: "from-purple-600 to-violet-600"
        };
    } else if (titleLower.includes('system design')) {
        return {
            icon: "🏗️",
            iconBg: "bg-blue-100 dark:bg-blue-900/30",
            iconColor: "text-blue-600 dark:text-blue-400",
            buttonGradient: "from-blue-600 to-indigo-600"
        };
    } else if (titleLower.includes('devops')) {
        return {
            icon: "⚙️",
            iconBg: "bg-green-100 dark:bg-green-900/30",
            iconColor: "text-green-600 dark:text-green-400",
            buttonGradient: "from-green-600 to-emerald-600"
        };
    }

    return {
        icon: "💼",
        iconBg: "bg-slate-100 dark:bg-slate-800",
        iconColor: "text-slate-600 dark:text-slate-400",
        buttonGradient: "from-slate-700 to-slate-900"
    };
};

export const getLevelBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
        case 'Beginner': return 'secondary';
        case 'Intermediate': return 'default';
        case 'Advanced': return 'destructive';
        default: return 'secondary';
    }
};
