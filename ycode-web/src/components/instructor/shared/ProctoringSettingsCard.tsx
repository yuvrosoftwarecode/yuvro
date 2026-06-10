import React from 'react';
import { Shield, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

interface ProctoringSettingsCardProps {
    enableProctoring: boolean;
    onEnableProctoringChange: (value: boolean) => void;
    tabSwitchThreshold?: number;
    onTabSwitchThresholdChange?: (value: number) => void;
    violationThreshold?: number;
    onViolationThresholdChange?: (value: number) => void;
    /** If true, shows a read-only "Always Enabled" badge (e.g. for Mock Interviews) */
    alwaysEnabled?: boolean;
    className?: string;
}

const ProctoringSettingsCard: React.FC<ProctoringSettingsCardProps> = ({
    enableProctoring,
    onEnableProctoringChange,
    tabSwitchThreshold = 3,
    onTabSwitchThresholdChange,
    violationThreshold = 5,
    onViolationThresholdChange,
    alwaysEnabled = false,
    className = '',
}) => {
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

                {alwaysEnabled ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 rounded-full">
                        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                        Always Enabled
                    </span>
                ) : (
                    <div className="flex items-center gap-2">
                        <Label htmlFor="enable-proctoring-toggle" className="text-xs text-muted-foreground">
                            {enableProctoring ? 'Enabled' : 'Disabled'}
                        </Label>
                        <Switch
                            id="enable-proctoring-toggle"
                            checked={enableProctoring}
                            onCheckedChange={onEnableProctoringChange}
                        />
                    </div>
                )}
            </div>

            {/* Active monitoring info */}
            {(alwaysEnabled || enableProctoring) && (
                <>
                    <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/40 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                                All monitoring layers are <strong>automatically active</strong> when proctoring is enabled:
                                webcam snapshots (every 30s + on face violations), face detection, audio anomaly detection,
                                tab-switch tracking, fullscreen enforcement, and copy/paste blocking.
                            </p>
                        </div>
                    </div>


                </>
            )}

            {!alwaysEnabled && !enableProctoring && (
                <p className="text-xs text-muted-foreground">
                    Enable proctoring to activate monitoring for this assessment.
                </p>
            )}
        </div>
    );
};

export default ProctoringSettingsCard;
