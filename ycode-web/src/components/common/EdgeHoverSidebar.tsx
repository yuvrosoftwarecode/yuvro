import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface EdgeHoverSidebarProps {
    children: React.ReactNode;
}

const EdgeHoverSidebar: React.FC<EdgeHoverSidebarProps> = ({ children }) => {
    const [isHovered, setIsHovered] = useState(false);
    const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = () => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
        if (!isHovered && !showTimer.current) {
            showTimer.current = setTimeout(() => {
                setIsHovered(true);
                showTimer.current = null;
            }, 250);
        }
    };

    const handleMouseLeave = () => {
        if (showTimer.current) {
            clearTimeout(showTimer.current);
            showTimer.current = null;
        }
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
            setIsHovered(false);
        }, 250);
    };

    return (
        <>
            {/* Edge-Hover Trigger Zone */}
            <div 
                className="absolute top-0 left-0 w-6 h-full z-[105] flex items-center group/trigger cursor-pointer"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Visual Grip Handle */}
                <div className={cn(
                    "absolute left-0 w-4 h-20 flex items-center justify-center transition-all duration-300 text-white group-hover/trigger:text-gray-50",
                    isHovered ? "opacity-0 -translate-x-full pointer-events-none" : "opacity-100 group-hover/trigger:w-5"
                )}>
                    {/* Smooth Curved Tab SVG Background */}
                    <svg viewBox="0 0 14 80" preserveAspectRatio="none" className="absolute inset-0 w-full h-full drop-shadow-md">
                        <path d="M 0 0 C 0 12, 14 12, 14 24 L 14 56 C 14 68, 0 68, 0 80 Z" fill="currentColor" stroke="#d1d5db" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    </svg>
                    
                    {/* Grip Lines */}
                    <div className="relative z-10 flex gap-[2px] pr-0.5">
                        <div className="w-[1.5px] h-3.5 bg-gray-400 opacity-60 rounded-full"></div>
                        <div className="w-[1.5px] h-3.5 bg-gray-400 opacity-60 rounded-full"></div>
                        <div className="w-[1.5px] h-3.5 bg-gray-400 opacity-60 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Hidden Drawer Envelope */}
            <div 
                className={cn(
                    "absolute top-0 left-0 h-full z-[100] transition-transform duration-300 ease-in-out shadow-[10px_0_30px_rgba(0,0,0,0.15)] flex",
                    isHovered ? "translate-x-0" : "-translate-x-full"
                )}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </div>

            {/* Dark Dimming Backdrop */}
            <div 
                className={cn(
                    "absolute inset-0 bg-black/10 backdrop-blur-[1px] z-[99] transition-opacity duration-300 pointer-events-none",
                    isHovered ? "opacity-100" : "opacity-0"
                )}
            />
        </>
    );
}

export default EdgeHoverSidebar;
