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
    iconClassName = "bg-white text-slate-600",
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
            className={`group relative h-full min-h-[320px] overflow-hidden border border-slate-200 bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-100 rounded-[2.5rem] ${className}`}
        >
            {/* Card Decoration (Hover Gradient) */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-gradient-to-br ${gradientColor} to-transparent`} />

            <div className="p-8 h-full flex flex-col relative z-10">
                <div className="flex items-start justify-between mb-6">
                    {/* Main Icon */}
                    <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${iconClassName}`}>
                        <span className="text-2xl filter drop-shadow-md">{icon}</span>
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex gap-2">
                            {tags.map((tag, i) => (
                                <Badge
                                    key={i}
                                    variant={tag.variant || "secondary"}
                                    className={`uppercase text-[9px] tracking-[0.2em] font-black px-3 py-1 rounded-xl transition-all ${tag.className || "bg-slate-100 text-slate-600"}`}
                                >
                                    {tag.text}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-grow space-y-3">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors duration-300 line-clamp-2 uppercase">
                        {title}
                    </h3>
                    <p className="text-sm font-semibold text-slate-400 line-clamp-3 leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Bottom Metadata */}
                <div className="mt-8 transition-opacity duration-500 group-hover:opacity-0 space-y-6">
                    {/* Progress Bar */}
                    {progress !== undefined && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span>Engine Sync</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer Info */}
                    {footerItems.length > 0 && (
                        <div className="pt-5 flex items-center justify-between border-t border-slate-100/50">
                            {footerItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="text-slate-400">{item.icon}</div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Start Button Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-8 translate-y-full group-hover:translate-y-0 transition-all duration-500 bg-gradient-to-t from-white via-white to-transparent pt-16 flex items-end">
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAction && onAction();
                        }}
                        className={`w-full text-white shadow-2xl rounded-2xl h-14 text-xs font-black uppercase tracking-[0.2em] bg-slate-900 hover:bg-black border-0 transition-all active:scale-95 group/btn overflow-hidden relative shadow-indigo-100`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                        <span className="relative z-10 flex items-center gap-3">
                            <Play className="h-4 w-4 fill-current group-hover/btn:translate-x-1 transition-transform" />
                            {actionLabel}
                        </span>
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default ModernCard;
