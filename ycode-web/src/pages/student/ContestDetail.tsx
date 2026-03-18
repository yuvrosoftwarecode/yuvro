import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../../components/common/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Trophy, Clock, Users, Calendar, Building2, GraduationCap, Zap,
    ArrowLeft, Play, CheckCircle2, AlertCircle, Timer,
    Target, FileText, Star, Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchContests, contestService } from "@/services/contestService";
import { collegeService, College, Department } from '@/services/collegeService';
import { updateProfileDetail } from '@/services/profileService';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import ContestLeaderboard from '../../components/student/ContestLeaderboard';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface Contest {
    id: number | string;
    title: string;
    organizer: string;
    type: string;
    difficulty: string;
    startDate: Date;
    endDate?: Date;
    duration: number;
    participants: number;
    prize?: string;
    status: string;
    isRegistered: boolean;
    registrationStartDate?: Date;
    registrationEndDate?: Date;
    allowLateEntry?: boolean;
    description?: string;
    instructions?: string;
    openForAllColleges?: boolean;
    allowedCollegesDetails?: { id: string; name: string }[];
    openForAllDepartments?: boolean;
    allowedDepartmentsDetails?: { id: string; name: string }[];
    requireStudentId?: boolean;
}

const ContestDetail: React.FC = () => {
    const { contestId } = useParams<{ contestId: string }>();
    const navigate = useNavigate();
    const [contest, setContest] = useState<Contest | null>(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [showProfileHelpModal, setShowProfileHelpModal] = useState(false);
    const [profileHelpMessage, setProfileHelpMessage] = useState("");

    // Inline college picker state
    const [showCollegePicker, setShowCollegePicker] = useState(false);
    const [collegePickerColleges, setCollegePickerColleges] = useState<College[]>([]);
    const [collegePickerDepts, setCollegePickerDepts] = useState<Department[]>([]);
    const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
    const [selectedDeptId, setSelectedDeptId] = useState<string>('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [pickerMode, setPickerMode] = useState<'college' | 'department'>('college');

    useEffect(() => {
        const loadContest = async () => {
            if (!contestId) return;
            try {
                const found = await contestService.getContest(contestId);
                // Map backend response to component state
                // Note: backend response keys might differ slightly, checking both
                const mapToState = (data: any) => ({
                    id: data.id,
                    title: data.title,
                    organizer: data.organizer,
                    type: data.type,
                    difficulty: data.difficulty,
                    startDate: new Date(data.start_datetime || data.start_date),
                    endDate: (data.end_datetime || data.end_date) ? new Date(data.end_datetime || data.end_date) : undefined,
                    duration: typeof data.duration === 'string' ? parseInt(data.duration) : (data.duration || 60),
                    participants: data.participants_count || 0,
                    prize: data.prize,
                    description: data.description,
                    instructions: data.instructions,
                    status: data.status,
                    isRegistered: data.is_registered || false,
                    registrationStartDate: (data.registration_start_datetime || data.registration_start_date)
                        ? new Date(data.registration_start_datetime || data.registration_start_date)
                        : undefined,
                    registrationEndDate: (data.registration_end_datetime || data.registration_end_date)
                        ? new Date(data.registration_end_datetime || data.registration_end_date)
                        : undefined,
                    allowLateEntry: data.allow_late_entry || false,
                    openForAllColleges: data.open_for_all_colleges ?? true,
                    allowedCollegesDetails: data.allowed_colleges_details || [],
                    openForAllDepartments: data.open_for_all_departments ?? true,
                    allowedDepartmentsDetails: data.allowed_departments_details || [],
                    requireStudentId: data.require_student_id ?? false,
                });

                if (found) {
                    setContest(mapToState(found));
                }
            } catch (err) {
                console.error("Failed to fetch contest", err);
                toast.error("Failed to load contest details");
            } finally {
                setLoading(false);
            }
        };
        loadContest();
    }, [contestId]);

    const handleRegister = async () => {
        if (!contest) return;
        setRegistering(true);
        try {
            const response = await contestService.registerContest(String(contest.id));
            setContest({
                ...contest,
                isRegistered: true,
                participants: (contest.participants || 0) + 1
            });

            if (response.is_late_entry && response.remaining_time_minutes) {
                toast.success(
                    `Registered! ⚠️ Late Entry: You have ${response.remaining_time_minutes} minutes remaining`,
                    { duration: 6000 }
                );
            } else {
                toast.success("Successfully registered for the contest!");
            }
        } catch (err: any) {
            const errorData = err.details || err.response?.data;
            const errorType = errorData?.error_type;
            const errorMsg = errorData?.error || errorData?.message || err.message || "Failed to register for contest";

            if (errorType === 'no_college' || errorType === 'no_department') {
                // Show inline picker instead of redirecting to profile
                setPickerMode(errorType === 'no_college' ? 'college' : 'department');
                try {
                    const colleges = await collegeService.getColleges('approved');
                    setCollegePickerColleges(colleges);
                } catch { /* ignore */ }
                setShowCollegePicker(true);
            } else if (errorType === 'college_mismatch') {
                const allowed = errorData?.allowed_college_names?.join(', ') || 'specific colleges';
                const yours = errorData?.student_college_name || 'your current college';
                toast.error(
                    `This contest is for: ${allowed}. Your profile shows: ${yours}.`,
                    { duration: 6000 }
                );
            } else if (errorType === 'department_mismatch') {
                const allowed = errorData?.allowed_department_names?.join(', ') || 'specific departments';
                const yours = errorData?.student_department_name || 'your current department';
                toast.error(
                    `This contest is for: ${allowed}. Your profile shows: ${yours}.`,
                    { duration: 6000 }
                );
            } else if (errorData?.requires_profile_update) {
                setProfileHelpMessage(errorMsg);
                setShowProfileHelpModal(true);
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setRegistering(false);
        }
    };

    const handleEnter = () => {
        if (contest) {
            navigate(`/student/contests/${contest.id}/attempt`);
        }
    };

    // Load departments when a college is selected in the picker
    const handlePickerCollegeChange = async (collegeId: string) => {
        setSelectedCollegeId(collegeId);
        setSelectedDeptId('');
        try {
            const depts = await collegeService.getDepartments('approved');
            setCollegePickerDepts(depts);
        } catch (err) {
            console.error(err);
        }
    };

    // Handle inline college picker save + auto-retry registration
    const handlePickerSave = async () => {
        try {
            setSavingProfile(true);
            const payload: any = {};
            if (selectedCollegeId) payload.college = selectedCollegeId;
            if (selectedDeptId) payload.department = selectedDeptId;

            await updateProfileDetail(payload);
            toast.success('Profile updated!');
            setShowCollegePicker(false);
            setSelectedCollegeId('');
            setSelectedDeptId('');

            // Auto-retry registration
            handleRegister();
        } catch {
            toast.error('Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'company': return <Building2 className="h-6 w-6" />;
            case 'college': return <GraduationCap className="h-6 w-6" />;
            case 'weekly': return <Zap className="h-6 w-6" />;
            default: return <Trophy className="h-6 w-6" />;
        }
    };

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'company': return { bg: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' };
            case 'college': return { bg: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600' };
            case 'weekly': return { bg: 'bg-emerald-100', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600' };
            default: return { bg: 'bg-amber-100', text: 'text-amber-600', gradient: 'from-amber-500 to-amber-600' };
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 'bg-green-100 text-green-700 border-green-200';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'hard': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getCountdown = (date: Date) => {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        if (diff <= 0) return 'Started';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const formatDateTime = (date: Date) => {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRegistrationInfo = (start?: Date, end?: Date, allowLateEntry?: boolean, contestEndDate?: Date) => {
        const now = new Date();
        if (start && now < start) {
            return {
                state: 'not_started' as const,
                message: `Registration opens on ${formatDateTime(start)}`,
                subMessage: `Opens in ${getCountdown(start)}`
            };
        }
        if (end && now > end) {
            // Check for late entry
            if (allowLateEntry && contestEndDate && now < contestEndDate) {
                return {
                    state: 'late_entry' as const,
                    message: 'Late Entry Open',
                    subMessage: `Late Entry ends in ${getCountdown(contestEndDate)}`
                };
            }
            return {
                state: 'closed' as const,
                message: 'Registration Closed',
                subMessage: 'Registration window has ended'
            };
        }
        return {
            state: 'open' as const,
            message: 'Registration Open',
            subMessage: end ? `Closes in ${getCountdown(end)}` : undefined
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="max-w-6xl mx-auto px-6 py-12">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-64 bg-gray-200 rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!contest) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="max-w-6xl mx-auto px-6 py-12 text-center">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Contest Not Found</h2>
                    <p className="text-muted-foreground mb-6">The contest you're looking for doesn't exist.</p>
                    <Button onClick={() => navigate('/student/contests')} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Contests
                    </Button>
                </div>
            </div>
        );
    }

    const style = getTypeStyle(contest.type);
    const isLive = contest.status === 'ongoing';
    const isPast = contest.status === 'past';
    const isUpcoming = contest.status === 'upcoming';
    const registrationInfo = getRegistrationInfo(contest.registrationStartDate, contest.registrationEndDate, contest.allowLateEntry, contest.endDate);
    const isRegistrationOpen = registrationInfo.state === 'open' || registrationInfo.state === 'late_entry';

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation />

            {/* Profile Requirements Modal */}
            <Dialog open={showProfileHelpModal} onOpenChange={setShowProfileHelpModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <AlertCircle className="h-6 w-6 text-amber-500" />
                            Profile Incomplete
                        </DialogTitle>
                        <DialogDescription className="pt-3 text-base text-gray-700">
                            {profileHelpMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-gray-50 p-4 rounded-lg my-2 text-sm text-gray-600 border border-gray-100">
                        This contest requires specific eligibility criteria (such as verifying your college, department, or student ID). Please update your profile with the required academic information to register.
                    </div>
                    <DialogFooter className="sm:justify-between items-center mt-2">
                        <Button variant="ghost" onClick={() => setShowProfileHelpModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => navigate('/student/profile')} className="bg-indigo-600 hover:bg-indigo-700">
                            Update Profile
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Inline College / Department Picker Modal */}
            <Dialog open={showCollegePicker} onOpenChange={setShowCollegePicker}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Building2 className="h-5 w-5 text-indigo-500" />
                            {pickerMode === 'college' ? 'Select Your College' : 'Select Your Department'}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            {pickerMode === 'college'
                                ? 'Choose your college to continue registration. This will be saved to your profile.'
                                : 'Choose your department to continue registration.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">College</label>
                            <Select
                                value={selectedCollegeId}
                                onValueChange={(val) => handlePickerCollegeChange(val)}
                            >
                                <SelectTrigger className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-xl">
                                    <SelectValue placeholder="Select your college" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] z-[100]">
                                    {collegePickerColleges.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {collegePickerDepts.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Department <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                                <Select
                                    value={selectedDeptId}
                                    onValueChange={(val) => setSelectedDeptId(val)}
                                >
                                    <SelectTrigger className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-xl">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[100]">
                                        {collegePickerDepts.map(d => (
                                            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setShowCollegePicker(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePickerSave}
                            disabled={!selectedCollegeId || savingProfile}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {savingProfile ? 'Saving...' : 'Save & Register'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="container mx-auto px-6 py-8">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => navigate('/student/contests')}
                    className="mb-6 text-muted-foreground hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Contests
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Hero Card */}
                        <Card className={cn(
                            "overflow-hidden border-0 shadow-lg",
                            isLive && "ring-2 ring-green-500"
                        )}>
                            {/* Header with gradient */}
                            <div className={`bg-gradient-to-r ${style.gradient} p-6 text-white relative overflow-hidden`}>
                                {/* Background pattern */}
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/20" />
                                    <div className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full bg-white/20" />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                            {getTypeIcon(contest.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className="bg-white/20 text-white border-0 capitalize">
                                                    {contest.type}
                                                </Badge>
                                                <Badge className={cn("border", getDifficultyColor(contest.difficulty))}>
                                                    {contest.difficulty}
                                                </Badge>
                                                {isLive && (
                                                    <Badge className="bg-green-500 text-white border-0 animate-pulse">
                                                        🔴 LIVE
                                                    </Badge>
                                                )}
                                            </div>
                                            <h1 className="text-2xl font-bold mb-1">{contest.title}</h1>
                                            <p className="text-white/80">by {contest.organizer}</p>
                                        </div>
                                    </div>

                                    {/* Stats row */}
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                                            <Calendar className="h-4 w-4" />
                                            {contest.startDate.toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                                            <Timer className="h-4 w-4" />
                                            {contest.duration} mins
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                                            <Users className="h-4 w-4" />
                                            {contest.participants} participants
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Section */}
                            <CardContent className="p-6 bg-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        {isUpcoming && (
                                            <div className="flex items-center gap-2 text-indigo-600">
                                                <Clock className="h-5 w-5" />
                                                <span className="font-semibold">Starts in {getCountdown(contest.startDate)}</span>
                                            </div>
                                        )}
                                        {isLive && (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-green-600">
                                                    <Play className="h-5 w-5 fill-current" />
                                                    <span className="font-semibold">Contest is Live!</span>
                                                </div>
                                                {contest.allowLateEntry && !contest.isRegistered && (registrationInfo.state === 'open' || registrationInfo.state === 'late_entry') && (
                                                    <div className="flex items-center gap-2 text-amber-600 animate-pulse">
                                                        <Timer className="h-4 w-4" />
                                                        <span className="font-medium text-sm">
                                                            Late Entry closes in {getCountdown(contest.registrationEndDate || contest.endDate || new Date())}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {isPast && (
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <CheckCircle2 className="h-5 w-5" />
                                                <span className="font-semibold">Contest Ended</span>
                                            </div>
                                        )}
                                        {!contest.isRegistered && !isPast && registrationInfo.state !== 'open' && (
                                            <div className="mt-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                                    <span className="font-medium">{registrationInfo.message}</span>
                                                </div>
                                                {registrationInfo.subMessage && (
                                                    <div className="text-xs text-gray-500 mt-1">{registrationInfo.subMessage}</div>
                                                )}
                                            </div>
                                        )}
                                        {!contest.isRegistered && !isPast && registrationInfo.state === 'open' && !isLive && registrationInfo.subMessage && (
                                            <div className="mt-2 text-xs text-gray-500">
                                                {registrationInfo.subMessage}
                                            </div>
                                        )}
                                    </div>

                                    {!isPast && (
                                        <Button
                                            size="lg"
                                            className={cn(
                                                "min-w-[150px] text-white border-0",
                                                contest.isRegistered
                                                    ? isLive
                                                        ? "bg-gradient-to-r from-green-500 to-emerald-600"
                                                        : "bg-gray-400"
                                                    : contest.allowLateEntry && isLive
                                                        ? "bg-gradient-to-r from-amber-500 to-orange-600"
                                                        : `bg-gradient-to-r ${style.gradient}`
                                            )}
                                            disabled={(contest.isRegistered && !isLive) || (!contest.isRegistered && !isRegistrationOpen)}
                                            onClick={() => {
                                                if (contest.isRegistered) {
                                                    handleEnter();
                                                } else if (isRegistrationOpen) {
                                                    handleRegister();
                                                } else {
                                                    toast(registrationInfo.message);
                                                }
                                            }}
                                        >
                                            {registering ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Registering...
                                                </span>
                                            ) : contest.isRegistered ? (
                                                isLive ? (
                                                    <>
                                                        <Play className="h-5 w-5 mr-2 fill-current" />
                                                        Enter Contest
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="h-5 w-5 mr-2" />
                                                        Registered
                                                    </>
                                                )
                                            ) : (
                                                <>
                                                    {contest.allowLateEntry && isLive ? (
                                                        <>
                                                            <Zap className="h-5 w-5 mr-2 fill-current" />
                                                            Late Entry
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Target className="h-5 w-5 mr-2" />
                                                            {registrationInfo.state === 'not_started'
                                                                ? 'Registration Opens Soon'
                                                                : registrationInfo.state === 'closed'
                                                                    ? 'Registration Closed'
                                                                    : 'Register Now'}
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Description */}
                        {contest.description && (
                            <Card className="border border-gray-100 shadow-sm">
                                <CardHeader className="border-b border-gray-100">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <FileText className="h-5 w-5 text-indigo-500" />
                                        About This Contest
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                        {contest.description}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Rules & Instructions */}
                        {contest.instructions && (
                            <Card className="border border-gray-100 shadow-sm">
                                <CardHeader className="border-b border-gray-100">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <AlertCircle className="h-5 w-5 text-amber-500" />
                                        Rules & Guidelines
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                        {contest.instructions}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Prizes Card */}
                        {contest.prize && (
                            <Card className="border border-gray-100 shadow-sm overflow-hidden">
                                <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
                                    <CardTitle className="flex items-center gap-2 text-lg text-amber-700">
                                        <Gift className="h-5 w-5" />
                                        Prizes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <p className="text-gray-700 font-medium whitespace-pre-wrap">{contest.prize}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Leaderboard */}
                        <ContestLeaderboard
                            contestId={contest.id}
                            contestTitle={contest.title}
                        />

                        {/* Quick Info */}
                        <Card className="border border-gray-100 shadow-sm">
                            <CardHeader className="border-b border-gray-100 pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Star className="h-4 w-4 text-indigo-500" />
                                    Quick Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Duration</span>
                                    <span className="font-medium">{contest.duration} minutes</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Type</span>
                                    <Badge variant="secondary" className="capitalize">{contest.type}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Difficulty</span>
                                    <Badge variant="outline" className={getDifficultyColor(contest.difficulty)}>
                                        {contest.difficulty}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge variant={isLive ? "default" : "secondary"} className={isLive ? "bg-green-500" : ""}>
                                        {contest.status}
                                    </Badge>
                                </div>

                                {(!contest.openForAllColleges || !contest.openForAllDepartments || contest.requireStudentId) && (
                                    <div className="pt-3 mt-3 border-t border-gray-100">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Eligibility Rules</span>
                                        <div className="space-y-2">
                                            {!contest.openForAllColleges && (
                                                <div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                                        <Building2 className="h-3 w-3 text-indigo-500" /> Specific Colleges Only
                                                    </div>
                                                    {contest.allowedCollegesDetails && contest.allowedCollegesDetails.length > 0 && (
                                                        <div className="mt-1.5 ml-5 space-y-1">
                                                            {contest.allowedCollegesDetails.map(c => (
                                                                <div key={c.id} className="text-xs text-gray-500 bg-indigo-50 rounded px-2 py-0.5 inline-block mr-1 mb-1">
                                                                    {c.name}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {!contest.openForAllDepartments && (
                                                <div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                                        <GraduationCap className="h-3 w-3 text-indigo-500" /> Specific Departments Only
                                                    </div>
                                                    {contest.allowedDepartmentsDetails && contest.allowedDepartmentsDetails.length > 0 && (
                                                        <div className="mt-1.5 ml-5 space-y-1">
                                                            {contest.allowedDepartmentsDetails.map(d => (
                                                                <div key={d.id} className="text-xs text-gray-500 bg-indigo-50 rounded px-2 py-0.5 inline-block mr-1 mb-1">
                                                                    {d.name}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {contest.requireStudentId && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <FileText className="h-3 w-3 text-indigo-500" /> Student Verification Required
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContestDetail;



