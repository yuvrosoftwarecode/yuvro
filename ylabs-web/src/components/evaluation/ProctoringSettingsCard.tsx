import React from 'react';
import { Shield, Info, Minus, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ProctoringConfig } from '@/lib/recruiter';

interface ProctoringSettingsCardProps {
    proctoring: ProctoringConfig;
    onChange: (proctoring: ProctoringConfig) => void;
    className?: string;
}

const ProctoringSettingsCard: React.FC<ProctoringSettingsCardProps> = ({
    proctoring,
    onChange,
    className = '',
}) => {
    const enableProctoring = proctoring.enableProctoring || false;

    return (
        <div className={`rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10">
                        <Shield className="h-4 w-4 text-slate-700 dark:text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Proctoring</h3>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">Exam integrity monitoring</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Label htmlFor="enable-proctoring-toggle" className="text-xs text-slate-500 dark:text-neutral-400">
                        {enableProctoring ? 'Enabled' : 'Disabled'}
                    </Label>
                    <Switch
                        id="enable-proctoring-toggle"
                        checked={enableProctoring}
                        className="data-[state=checked]:bg-slate-900 data-[state=unchecked]:bg-white data-[state=unchecked]:border-slate-900 [&_span[data-state=unchecked]]:!bg-slate-900 [&_span[data-state=checked]]:!bg-white"
                        onCheckedChange={(v) => onChange({ 
                            ...proctoring, 
                            enableProctoring: v,
                            enableCopyPaste: v ? false : proctoring.enableCopyPaste,
                            tabSwitchAllowed: v ? false : proctoring.tabSwitchAllowed 
                        })}
                    />
                </div>
            </div>

            {/* Active monitoring info */}
            {enableProctoring && (
                <>
                    <div className="bg-slate-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-3.5 w-3.5 text-slate-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
                                When enabled, standard monitoring (tab switches, webcam, full screen, AI face detection) applies. Customize further rules below.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-neutral-200 dark:border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium text-slate-900 dark:text-white">Enable Copy & Paste</Label>
                                <p className="text-xs text-slate-500 dark:text-neutral-400">Allow copying text into or out of the editor</p>
                            </div>
                            <Switch
                                checked={proctoring.enableCopyPaste ?? false}
                                className="data-[state=checked]:bg-slate-900 data-[state=unchecked]:bg-white data-[state=unchecked]:border-slate-900 [&_span[data-state=unchecked]]:!bg-slate-900 [&_span[data-state=checked]]:!bg-white"
                                onCheckedChange={(v) => onChange({ ...proctoring, enableCopyPaste: v })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium text-slate-900 dark:text-white">Tab Switch Allowed</Label>
                                <p className="text-xs text-slate-500 dark:text-neutral-400">Allow candidates to switch browser tabs freely</p>
                            </div>
                            <Switch
                                checked={proctoring.tabSwitchAllowed ?? false}
                                className="data-[state=checked]:bg-slate-900 data-[state=unchecked]:bg-white data-[state=unchecked]:border-slate-900 [&_span[data-state=unchecked]]:!bg-slate-900 [&_span[data-state=checked]]:!bg-white"
                                onCheckedChange={(v) => onChange({ ...proctoring, tabSwitchAllowed: v })}
                            />
                        </div>
                        
                        {!proctoring.tabSwitchAllowed && (
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium text-slate-900 dark:text-white">Tab Switch Limit</Label>
                                    <p className="text-xs text-slate-500 dark:text-neutral-400">Max allowed tab switches before auto-submit</p>
                                </div>
                                <div className="relative w-24">
                                    <Input 
                                        type="number" 
                                        min={0} 
                                        className="w-full h-8 text-sm bg-white dark:bg-white/[0.05] text-slate-900 dark:text-white border-neutral-200 dark:border-white/10 pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:ring-offset-0"
                                        value={proctoring.tabSwitchLimit ?? 3}
                                        onChange={(e) => onChange({ ...proctoring, tabSwitchLimit: parseInt(e.target.value) || 0 })}
                                    />
                                    <div className="absolute right-[1px] top-[1px] bottom-[1px] flex flex-col w-5 border-l border-neutral-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.05] rounded-r-md overflow-hidden">
                                        <button 
                                            type="button"
                                            className="flex-1 flex items-center justify-center text-slate-500 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white border-b border-neutral-200 dark:border-white/10 transition-colors"
                                            onClick={() => onChange({ ...proctoring, tabSwitchLimit: (proctoring.tabSwitchLimit ?? 3) + 1 })}
                                        >
                                            <ChevronUp className="h-3 w-3" />
                                        </button>
                                        <button 
                                            type="button"
                                            className="flex-1 flex items-center justify-center text-slate-500 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            onClick={() => onChange({ ...proctoring, tabSwitchLimit: Math.max(0, (proctoring.tabSwitchLimit ?? 3) - 1) })}
                                        >
                                            <ChevronDown className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {!enableProctoring && (
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Enable proctoring to activate monitoring for this section.
                </p>
            )}
        </div>
    );
};

export default ProctoringSettingsCard;
