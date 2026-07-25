import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
    Clock, 
    AlertTriangle, 
    Trophy, 
    Activity, 
    ShieldAlert, 
    Camera, 
    Maximize, 
    CheckCircle2, 
    XCircle, 
    AlertCircle,
    Eye,
    ShieldCheck,
    X,
    FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { Candidate } from '@/lib/recruiterCandidates';

const ViolationDescription = ({ text }: { text: string }) => {
    const [expanded, setExpanded] = useState(false);
    
    // Check if it's long either by lines or by raw length
    const lines = text.split('\n');
    const isLong = lines.length > 5 || text.length > 300;
    
    if (!isLong) return <div className="text-sm text-neutral-400 whitespace-pre-wrap">{text}</div>;
    
    const displayText = expanded 
        ? text 
        : (lines.length > 5 ? lines.slice(0, 5).join('\n') + '...' : text.slice(0, 300) + '...');
    
    return (
        <div className="text-sm text-neutral-400 whitespace-pre-wrap break-all">
            {displayText}
            <div className="mt-1">
                <button 
                    onClick={() => setExpanded(!expanded)} 
                    className="text-blue-400 hover:text-blue-300 font-medium hover:underline text-xs"
                >
                    {expanded ? 'Show Less' : 'Read More'}
                </button>
            </div>
        </div>
    );
};

interface CandidateAnalyticsViewerProps {
    candidate: Candidate;
}

const formatEventTime = (timestamp: number) => {
    return format(new Date(timestamp), 'h:mm:ss a');
};

const CustomTooltipContent = ({ data, label }: any) => {
    const log = data.log;
    const severity = data.severity;
    
    return (
        <div className="space-y-3">
            {label && <div className="font-mono text-[10px] text-muted-foreground mb-1">{label}</div>}
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${severity === 2 ? 'bg-rose-500' : severity === 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                <span className="font-bold text-sm">{data.severityName}</span>
            </div>
            {log.type && (
                <div className="space-y-1">
                    <span className="font-semibold capitalize text-xs text-white block">
                        {log.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-neutral-400">{log.desc}</span>
                </div>
            )}
            {(log.image_path || log.screen_path) && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                    {log.image_path && <img src={log.image_path} alt="Webcam" className="w-1/2 h-auto rounded-md border border-white/10" />}
                    {log.screen_path && <img src={log.screen_path} alt="Screen" className="w-1/2 h-auto rounded-md border border-white/10" />}
                </div>
            )}
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-neutral-900 p-3 rounded-lg shadow-xl border border-white/10 max-w-[300px]">
                <CustomTooltipContent data={data} label={label} />
            </div>
        );
    }
    return null;
};

export const CandidateAnalyticsViewer: React.FC<CandidateAnalyticsViewerProps> = ({ candidate }) => {
    const [selectedSection, setSelectedSection] = useState<'labs' | 'assessment' | 'vitarka'>('labs');
    
    // Derived Risk Analysis
    const totalViolations = candidate.proctoringData?.totalViolations || 0;
    const riskLevel = totalViolations > 6 ? 'Critical' : totalViolations > 3 ? 'High' : totalViolations > 0 ? 'Low' : 'Clean';
    
    const violations = candidate.proctoringData?.timelineEvents || [];
    
    // Graph Data
    const chartData = violations.map(log => ({
        name: formatEventTime(log.time),
        time: formatEventTime(log.time),
        severity: log.severity || 1,
        severityName: log.severity === 2 ? 'Critical' : log.severity === 1 ? 'General' : 'Normal',
        log
    }));

    return (
        <div className="space-y-6">
            {/* Unified Top Banner */}
            <div className="bg-white/[0.02] border border-white/5 shadow-sm rounded-2xl flex flex-col xl:flex-row overflow-hidden">
                <div className="flex-1 flex flex-col p-6 xl:p-8 border-b xl:border-b-0 xl:border-r border-white/5">
                    <div className="flex flex-col sm:flex-row gap-6 pb-6 border-b border-white/5">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-500/10 text-orange-500">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold tracking-tight text-white">{candidate.eci}</p>
                                <p className="text-sm font-medium text-neutral-500">Overall ECI</p>
                            </div>
                        </div>
                        <div className="hidden sm:block w-px bg-white/5 self-stretch" />
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-500/10 text-blue-500">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xl font-bold tracking-tight text-white capitalize">{candidate.status}</p>
                                <p className="text-sm font-medium text-neutral-500">Submission Status</p>
                            </div>
                        </div>
                        <div className="hidden sm:block w-px bg-white/5 self-stretch" />
                        <div className="flex items-center gap-4 flex-1">
                            <div className={`flex items-center justify-center w-14 h-14 rounded-full ${riskLevel === 'Clean' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {riskLevel === 'Clean' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className="text-xl font-bold tracking-tight text-white capitalize">{riskLevel}</p>
                                <p className="text-sm font-medium text-neutral-500">Risk Level</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-6 pt-6">
                        <div className="flex gap-4 flex-1">
                            <div className={`flex items-center justify-center w-14 h-14 rounded-full ${totalViolations > 0 ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-2xl font-bold tracking-tight text-white">{totalViolations}</p>
                                <p className="text-sm font-medium text-neutral-500 mb-2">Total Violations</p>
                            </div>
                        </div>
                        <div className="hidden sm:block w-px bg-white/5 self-stretch" />
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-purple-500/10 text-purple-500">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xl font-bold tracking-tight text-white">{format(new Date(candidate.submittedAt), 'MMM d, h:mm a')}</p>
                                <p className="text-sm font-bold text-purple-600 mt-0.5">Submitted At</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-3 w-full md:w-[500px] mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="sections">Section Breakdown</TabsTrigger>
                    <TabsTrigger value="violations" className="flex items-center gap-1.5">
                        Violations
                        {totalViolations > 0 && (
                            <Badge variant="destructive" className="h-4 min-w-4 px-1 flex items-center justify-center text-[10px]">
                                {totalViolations}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="border border-white/5 bg-white/[0.02] shadow-sm mt-6 rounded-xl overflow-hidden">
                        <div className="pb-3 border-b border-white/5 mb-4 p-6">
                            <h3 className="text-base font-semibold flex items-center gap-2 text-white">
                                <Activity className="h-5 w-5 text-neutral-500" />
                                Overall Test Timeline
                            </h3>
                        </div>
                        <div className="p-6 pt-0">
                            {chartData.length === 0 ? (
                                <div className="text-neutral-500 italic text-xs py-4 text-center">No proctoring events recorded for this session.</div>
                            ) : (
                                <div className="w-full overflow-x-auto pb-4">
                                    <div className="relative min-w-[800px]" style={{ width: Math.max(800, chartData.length * 60), height: 350 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart 
                                                data={chartData} 
                                                margin={{ top: 20, right: 30, left: 10, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorSeverityOverall" x1="0" y1="1" x2="0" y2="0">
                                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.15}/>
                                                        <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.15}/>
                                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.15}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorStrokeOverall" x1="0" y1="1" x2="0" y2="0">
                                                        <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                                                        <stop offset="50%" stopColor="#f59e0b" stopOpacity={1}/>
                                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={1}/>
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickMargin={15} stroke="hsl(var(--muted-foreground))" />
                                                <YAxis 
                                                    domain={[0, 2.2]} 
                                                    ticks={[0, 1, 2]} 
                                                    tickFormatter={(value) => value === 0 ? 'Normal' : value === 1 ? 'General' : value === 2 ? 'Critical' : ''}
                                                    tick={{ fontSize: 10, fontWeight: 600 }}
                                                    width={60}
                                                    stroke="none"
                                                />
                                                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                                                
                                                <ReferenceLine y={2} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.4} />
                                                <ReferenceLine y={1} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} />
                                                <ReferenceLine y={0} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4} />

                                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                                
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="severity" 
                                                    stroke="url(#colorStrokeOverall)" 
                                                    fillOpacity={1} 
                                                    fill="url(#colorSeverityOverall)" 
                                                    strokeWidth={2}
                                                    activeDot={{ r: 6, strokeWidth: 2, stroke: 'white', cursor: 'pointer' }}
                                                    dot={(props) => {
                                                        const { cx, cy, payload } = props;
                                                        if (!cx || !cy) return null;
                                                        const fill = payload.severity === 2 ? '#f43f5e' : payload.severity === 1 ? '#f59e0b' : '#10b981';
                                                        return <circle key={`dot-overall-${payload.name}-${cx}`} cx={cx} cy={cy} r={4} fill={fill} stroke="white" strokeWidth={1.5} />;
                                                    }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="sections" className="space-y-6">
                    <div className="border border-white/5 bg-white/[0.02] shadow-sm rounded-xl overflow-hidden">
                        <div className="p-6 pb-3">
                            <h3 className="text-base font-semibold flex items-center gap-2 text-white">
                                <FileText className="h-5 w-5 text-neutral-500" />
                                Section-by-Section Activity
                            </h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-6">
                                <div className="flex space-x-2">
                                    {(['labs', 'assessment', 'vitarka'] as const).map(section => (
                                        <button
                                            key={section}
                                            onClick={() => setSelectedSection(section)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                                selectedSection === section 
                                                    ? 'bg-white/10 text-white shadow-sm border border-white/20' 
                                                    : 'hover:bg-white/5 text-neutral-400 border border-white/10'
                                            }`}
                                        >
                                            {section === 'labs' ? 'Engineering Labs' : section === 'assessment' ? 'Knowledge Assessments' : 'Vitarka Discussion'}
                                        </button>
                                    ))}
                                </div>

                                {(() => {
                                    const sectionData = candidate.proctoringData?.sections?.[selectedSection];
                                    if (!sectionData) return <div className="text-neutral-500">No data for this section.</div>;

                                    return (
                                        <div className="border border-white/5 rounded-lg p-5 bg-white/[0.01] shadow-sm">
                                            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                                                <div>
                                                    <h3 className="font-bold text-lg text-white capitalize">
                                                        {selectedSection === 'labs' ? 'Engineering Labs' : selectedSection === 'assessment' ? 'Knowledge Assessments' : 'Vitarka Discussion'}
                                                    </h3>
                                                    <div className="text-sm text-neutral-500 flex items-center gap-4 mt-1">
                                                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {sectionData.timeSpent} mins spent</span>
                                                        <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4" /> Score: {sectionData.score}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium mb-3 text-neutral-500">Violations in this section</h4>
                                                {sectionData.events.filter(ev => ev.type !== 'snapshot').length === 0 ? (
                                                    <p className="text-sm text-emerald-500">No violations occurred during this section.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {sectionData.events.filter(ev => ev.type !== 'snapshot').map((ev, i) => (
                                                            <div key={i} className="flex items-start gap-3 bg-white/[0.02] p-3 rounded-md border border-white/5">
                                                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ev.severity === 2 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                                                <span className="text-sm font-mono text-neutral-500 mt-0.5 shrink-0">{formatEventTime(ev.time)}</span>
                                                                <div className="text-neutral-300 w-full overflow-hidden">
                                                                    <div className="text-xs font-semibold mb-0.5 text-white capitalize">{ev.type.replace('_', ' ')}</div>
                                                                    <ViolationDescription text={ev.desc} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="violations" className="space-y-6">
                    <div className="border border-white/5 bg-white/[0.02] shadow-sm rounded-xl overflow-hidden">
                        <div className="p-6 pb-3">
                            <h3 className="text-base font-semibold flex items-center gap-2 text-rose-500">
                                <AlertCircle className="h-5 w-5" />
                                Proctoring Violations Timeline ({totalViolations})
                            </h3>
                        </div>
                        <div className="p-6 pt-2">
                            {totalViolations === 0 ? (
                                <div className="text-center py-12 text-emerald-500 flex flex-col items-center justify-center gap-3 bg-emerald-500/5 border border-dashed border-emerald-500/30 rounded-lg">
                                    <ShieldCheck className="h-10 w-10 text-emerald-500" />
                                    <div className="font-semibold text-base">Perfect Session Integrity!</div>
                                    <p className="text-xs text-emerald-500/80">The student did not trigger any proctoring flags during the assessment.</p>
                                </div>
                            ) : (
                                <div className="relative border-l border-white/10 pl-6 ml-3 space-y-6">
                                    {violations.filter(event => event.type !== 'snapshot').map((event, idx) => {
                                        return (
                                            <div key={idx} className="relative group">
                                                <div className={`absolute -left-[31px] p-1 rounded-full border-2 border-neutral-900 bg-neutral-900 text-rose-500`}>
                                                    <AlertTriangle className="h-3 w-3" />
                                                </div>
                                                <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white/[0.02] p-4 rounded-lg border border-white/5 transition-colors">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold capitalize text-white">{event.type.replace('_', ' ')}</span>
                                                            {event.severity > 0 && <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/50">Violation</Badge>}
                                                        </div>
                                                        <ViolationDescription text={event.desc} />
                                                        {(event.image_path || event.screen_path) && (
                                                            <div className="flex gap-3 mt-3">
                                                                {event.image_path && (
                                                                    <div className="relative group/img">
                                                                        <img src={event.image_path} alt="Webcam snapshot" className="w-48 h-auto rounded-md border border-white/10 opacity-80 group-hover/img:opacity-100 transition" />
                                                                    </div>
                                                                )}
                                                                {event.screen_path && (
                                                                    <div className="relative group/img">
                                                                        <img src={event.screen_path} alt="Screen snapshot" className="w-48 h-auto rounded-md border border-white/10 opacity-80 group-hover/img:opacity-100 transition" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="font-mono text-sm text-neutral-500">{formatEventTime(event.time)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
