import React from 'react';
import { Shield, Info } from 'lucide-react';
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
        <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                        <Shield className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Proctoring</h3>
                        <p className="text-xs text-muted-foreground">Exam integrity monitoring</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Label htmlFor="enable-proctoring-toggle" className="text-xs text-muted-foreground">
                        {enableProctoring ? 'Enabled' : 'Disabled'}
                    </Label>
                    <Switch
                        id="enable-proctoring-toggle"
                        checked={enableProctoring}
                        onCheckedChange={(v) => onChange({ 
                            ...proctoring, 
                            enableProctoring: v,
                            enableCopyPaste: v ? true : proctoring.enableCopyPaste,
                            tabSwitchAllowed: v ? true : proctoring.tabSwitchAllowed 
                        })}
                    />
                </div>
            </div>

            {/* Active monitoring info */}
            {enableProctoring && (
                <>
                    <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/40 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                                When enabled, standard monitoring (tab switches, webcam, full screen, AI face detection) applies. Customize further rules below.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">Enable Copy & Paste</Label>
                                <p className="text-xs text-muted-foreground">Allow copying text into or out of the editor</p>
                            </div>
                            <Switch
                                checked={proctoring.enableCopyPaste ?? false}
                                onCheckedChange={(v) => onChange({ ...proctoring, enableCopyPaste: v })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">Tab Switch Allowed</Label>
                                <p className="text-xs text-muted-foreground">Allow candidates to switch browser tabs freely</p>
                            </div>
                            <Switch
                                checked={proctoring.tabSwitchAllowed ?? false}
                                onCheckedChange={(v) => onChange({ ...proctoring, tabSwitchAllowed: v })}
                            />
                        </div>
                        
                        {!proctoring.tabSwitchAllowed && (
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium">Tab Switch Limit</Label>
                                    <p className="text-xs text-muted-foreground">Max allowed tab switches before auto-submit</p>
                                </div>
                                <Input 
                                    type="number" 
                                    min={0} 
                                    className="w-24 h-8 text-sm"
                                    value={proctoring.tabSwitchLimit ?? 3}
                                    onChange={(e) => onChange({ ...proctoring, tabSwitchLimit: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}

            {!enableProctoring && (
                <p className="text-xs text-muted-foreground">
                    Enable proctoring to activate monitoring for this section.
                </p>
            )}
        </div>
    );
};

export default ProctoringSettingsCard;
