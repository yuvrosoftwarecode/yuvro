import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export interface StatsCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    colorScheme?: "blue" | "green" | "purple" | "amber" | "red" | "orange";
    size?: "sm" | "md" | "lg";
    className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    label,
    value,
    icon: Icon,
    trend,
    colorScheme = "blue",
    size = "lg",
    className
}) => {

    const getColorClasses = (scheme: string) => {
        switch (scheme) {
            case "green":
                return {
                    bg: "bg-gradient-to-br from-white to-green-50/50",
                    iconBg: "bg-gradient-to-br from-green-100 to-green-50",
                    startColor: "text-green-600",
                    hoverText: "group-hover:text-green-600",
                    glow: "bg-green-500/5"
                };
            case "purple":
                return {
                    bg: "bg-gradient-to-br from-white to-purple-50/50",
                    iconBg: "bg-gradient-to-br from-purple-100 to-purple-50",
                    startColor: "text-purple-600",
                    hoverText: "group-hover:text-purple-600",
                    glow: "bg-purple-500/5"
                };
            case "amber":
                return {
                    bg: "bg-gradient-to-br from-white to-amber-50/50",
                    iconBg: "bg-gradient-to-br from-amber-100 to-amber-50",
                    startColor: "text-amber-600",
                    hoverText: "group-hover:text-amber-600",
                    glow: "bg-amber-500/5"
                };
            case "red":
                return {
                    bg: "bg-gradient-to-br from-white to-red-50/50",
                    iconBg: "bg-gradient-to-br from-red-100 to-red-50",
                    startColor: "text-red-600",
                    hoverText: "group-hover:text-red-600",
                    glow: "bg-red-500/5"
                };
            case "orange":
                return {
                    bg: "bg-gradient-to-br from-white to-orange-50/50",
                    iconBg: "bg-gradient-to-br from-orange-100 to-orange-50",
                    startColor: "text-orange-600",
                    hoverText: "group-hover:text-orange-600",
                    glow: "bg-orange-500/5"
                };
            default: // blue
                return {
                    bg: "bg-gradient-to-br from-white to-blue-50/50",
                    iconBg: "bg-gradient-to-br from-blue-100 to-blue-50",
                    startColor: "text-blue-600",
                    hoverText: "group-hover:text-blue-600",
                    glow: "bg-blue-500/5"
                };
        }
    };

    const getSizeClasses = (s: string) => {
        switch (s) {
            case "sm":
                return { valueText: "text-xl", labelText: "text-xs", iconSize: "w-8 h-8", iconSvg: "w-4 h-4" };
            case "md":
                return { valueText: "text-2xl", labelText: "text-sm", iconSize: "w-10 h-10", iconSvg: "w-5 h-5" };
            default: // lg
                return { valueText: "text-3xl", labelText: "text-sm", iconSize: "w-12 h-12", iconSvg: "w-6 h-6" };
        }
    };

    const colors = getColorClasses(colorScheme);
    const sizes = getSizeClasses(size);

    return (
        <Card className={`group border-0 shadow-sm ${colors.bg} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative ${className}`}>
            <div className={`absolute inset-0 ${colors.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <CardContent className="p-5 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center ${sizes.iconSize} rounded-2xl ${colors.iconBg} ${colors.startColor} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={sizes.iconSvg} />
                    </div>
                    <div>
                        <p className={`${sizes.valueText} font-bold tracking-tight text-slate-900`}>{value}</p>
                        <p className={`${sizes.labelText} font-medium text-slate-500 ${colors.hoverText} transition-colors`}>{label}</p>
                        {trend && (
                            <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'} flex items-center gap-1 mt-1`}>
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
