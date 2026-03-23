import React, { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface Tag {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline" | null;
    className?: string;
}

interface FooterItem {
    icon: ReactNode;
    text: string | number;
}

interface ModernCardProps {
    title: string;
    description: string;
    icon: ReactNode;
    iconClassName?: string; // e.g. "bg-blue-100 text-blue-600"
    gradientColor?: string; // e.g. "from-blue-500"
    tags?: Tag[];
    footerItems?: FooterItem[];
    actionLabel?: string;
    onAction?: () => void;
    progress?: number; // Optional progress bar percentage
    className?: string; // Extra styles
}

const ModernCard: React.FC<ModernCardProps> = ({
    title,
    description,
    icon,
    iconClassName = "bg-slate-100 text-slate-600",
    gradientColor = "from-blue-500",
    tags = [],
    footerItems = [],
    actionLabel = "Start Learning",
    onAction,
    progress,
    className = ""
}) => {
    return (
        <Card
            className={`group relative h-full min-h-[280px] overflow-hidden border border-gray-200 bg-card shadow-none transition-all duration-300 hover:-translate-y-1 ${className}`}
        >
            {/* Card Decoration (Hover Gradient) */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${gradientColor.split(' ')[0]} to-transparent`} />

            <div className="p-5 h-full flex flex-col relative z-10">
                <div className="flex items-start justify-between mb-4">
                    {/* Main Icon */}
                    <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl ${iconClassName} group-hover:scale-110 transition-transform duration-500`}>
                        <span className="text-2xl filter drop-shadow-sm">{icon}</span>
                    </div>

                    {/* Tags (e.g. Difficulty, New, etc.) */}
                    {tags.length > 0 && (
                        <div className="flex gap-2">
                            {tags.map((tag, i) => (
                                <Badge
                                    key={i}
                                    variant={tag.variant || "secondary"}
                                    className={`uppercase text-[10px] tracking-wider font-semibold px-2 py-0.5 ${tag.className || ""}`}
                                >
                                    {tag.text}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content (Grows to push bottom section down) */}
                <div className="flex-grow space-y-2">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
                        {title}
                    </h3>
                    <p className="text-sm text-muted-foreground/80 line-clamp-3 leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Bottom Metadata (Progress + Footer) - Fades out on hover */}
                <div className="mt-4 transition-opacity duration-300 group-hover:opacity-0">
                    {/* Progress Bar (if applicable) */}
                    {progress !== undefined && (
                        <div className="mb-4">
                            <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-500">
                                <span>Progress</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer Info */}
                    {footerItems.length > 0 && (
                        <div className="pt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-slate-50">
                            {footerItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    {item.icon}
                                    <span>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Start Button Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-background via-background to-transparent pt-10 flex items-end">
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAction && onAction();
                        }}
                        className={`w-full text-white shadow-md rounded-lg h-10 text-sm font-semibold tracking-wide bg-gradient-to-r ${gradientColor} hover:opacity-90 border-0`}
                    >
                        <Play className="h-4 w-4 mr-2 fill-current" />
                        {actionLabel}
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default ModernCard;
