import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/common/DashboardLayout';
import PublicLayout from '@/components/common/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Trophy, Clock, Users, Calendar, Building2, GraduationCap, Zap,
    ArrowLeft, ChevronLeftCircle, ChevronRight, Play, CheckCircle2, AlertCircle, Timer,
    Target, FileText, Star, Gift, Globe
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
    const location = useLocation();
    const isPublic = location.pathname.startsWith('/public/');
    const basePath = isPublic ? '/public/contests' : '/student/contests';
    const Layout: React.FC<any> = isPublic ? PublicLayout : DashboardLayout;
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
                const found = isPublic 
                    ? await contestService.getPublicContest(contestId)
                    : await contestService.getContest(contestId);
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

    const handleRegister = () => {
        if (!contest) return;
        navigate(`${basePath}/${contest.id}/register`);
    };

    const handleEnter = () => {
        if (contest) {
            navigate(`${basePath}/${contest.id}/attempt`);
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
            <Layout {...(!isPublic ? { hideHeader: true, hideFooter: true, contentClassName: 'bg-gray-50' } : {})}>
                <div className="max-w-6xl mx-auto px-6 py-12">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-64 bg-gray-200 rounded-xl"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!contest) {
        return (
            <Layout {...(!isPublic ? { hideHeader: true, hideFooter: true, contentClassName: 'bg-gray-50' } : {})}>
                <div className="max-w-6xl mx-auto px-6 py-12 text-center">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Contest Not Found</h2>
                    <p className="text-muted-foreground mb-6">The contest you're looking for doesn't exist.</p>
                    <Button onClick={() => navigate(basePath)} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Contests
                    </Button>
                </div>
            </Layout>
        );
    }

    const style = getTypeStyle(contest.type);
    const isLive = contest.status === 'ongoing';
    const isPast = contest.status === 'past';
    const isUpcoming = contest.status === 'upcoming';
    const registrationInfo = getRegistrationInfo(contest.registrationStartDate, contest.registrationEndDate, contest.allowLateEntry, contest.endDate);
    const isRegistrationOpen = registrationInfo.state === 'open' || registrationInfo.state === 'late_entry';

    return (
        <Layout {...(!isPublic ? { hideHeader: true, hideFooter: true, contentClassName: 'bg-gray-50' } : {})}>

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

            <div className="mx-auto max-w-[1440px] px-4 sm:px-8 py-4 md:py-6 font-inter">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 mb-4 w-fit font-inter">
                    {!isPublic && (
                        <>
                            <ChevronLeftCircle 
                                size={32} 
                                color="#343330" 
                                strokeWidth={1.5} 
                                className="cursor-pointer" 
                                onClick={() => navigate(basePath)} 
                            />
                            <span 
                                className="text-[14px] leading-[16.8px] text-[#757575] font-normal cursor-pointer hover:text-gray-900"
                                onClick={() => navigate(basePath)}
                            >
                                Contests
                            </span>
                            <ChevronRight size={14} color="#343330" strokeWidth={2} />
                        </>
                    )}
                    <span className="text-[14px] leading-[16.8px] text-[#343330] font-normal">
                        Details
                    </span>
                </div>

                {/* Hero Banner */}
                <div className="relative w-full rounded-[20px] overflow-hidden mb-[16px] min-h-[120px] flex items-center">
                    <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: "url('/images/contest-banner-new.png')" }}
                    >
                        <div className="absolute inset-0 bg-[#000000]/[0.22]"></div>
                    </div>

                    <div className="relative z-10 w-full px-[40px] py-[16px] flex justify-between items-center gap-8">
                        <div className="flex flex-col max-w-[800px]">
                            {/* Top Badge */}
                            <div className="inline-flex items-center gap-[4px] px-[12px] py-[6px] rounded-[16px] border border-white/20 bg-white/10 backdrop-blur-sm text-[#E0E0E0] text-[13px] leading-[16px] font-medium mb-[12px] w-fit">
                                <Trophy size={14} />
                                Contest
                            </div>

                            {/* Title & Description */}
                            <h1 className="font-manrope text-[48px] leading-[1.2] font-bold text-white tracking-[-0.01em] mb-[8px]">
                                {contest.title}
                            </h1>
                            
                            <p className="font-inter text-[18px] leading-[26px] text-[#F3F3F3] font-normal mb-[16px]">
                                {contest.description ? contest.description : `Join the ${contest.title} and unleash your coding potential! Collaborate with innovators and tackle challenges that push the boundaries of technology.`}
                            </p>

                            {/* Bottom Badges */}
                            <div className="flex items-center gap-[12px]">
                                <div className="inline-flex items-center justify-center px-[12px] py-[6px] rounded-[16px] border border-[#00C48C]/40 bg-[#00C48C]/10 backdrop-blur-sm font-inter font-medium text-[13px] leading-[16px] text-[#00C48C]">
                                    {isRegistrationOpen ? 'Registration Open' : registrationInfo.state === 'closed' ? 'Registration Closed' : 'Registration Upcoming'}
                                </div>
                                {contest.openForAllColleges && (
                                    <div className="inline-flex items-center justify-center gap-[6px] px-[12px] py-[6px] rounded-[16px] border border-white/20 bg-white/10 text-[#E0E0E0] font-inter text-[13px] leading-[16px] font-medium backdrop-blur-sm">
                                        <Globe size={14} />
                                        Open to All
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Date Box */}
                        {contest.endDate && (
                            <div className="shrink-0 flex flex-col items-center justify-center min-w-[120px] p-[16px] rounded-[16px] border border-white/20 bg-white/10 backdrop-blur-md text-white shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                                <span className="font-inter font-medium text-[14px] leading-[16px] text-[#E0E0E0] mb-[4px]">Ends on</span>
                                <div className="flex items-start text-[#F89A2E]">
                                    <span className="font-manrope font-bold text-[48px] leading-[1] tracking-[-0.01em]">{contest.endDate.getDate()}</span>
                                    <span className="font-inter font-bold text-[16px] leading-[1] mt-[6px] ml-[2px]">
                                        {contest.endDate.getDate() === 1 || contest.endDate.getDate() === 21 || contest.endDate.getDate() === 31 ? 'st' : 
                                         contest.endDate.getDate() === 2 || contest.endDate.getDate() === 22 ? 'nd' : 
                                         contest.endDate.getDate() === 3 || contest.endDate.getDate() === 23 ? 'rd' : 'th'}
                                    </span>
                                </div>
                                <span className="font-inter font-bold text-[26px] leading-[1] tracking-[-0.01em] text-white mt-[4px]">
                                    {contest.endDate.toLocaleString('en-US', { month: 'long' })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        
                        {/* Overview Section */}
                        <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-5 md:p-6">
                            <h2 className="text-[16px] font-bold text-[#F59E0B] mb-3">Overview</h2>
                            <p className="text-[14px] leading-[22px] text-[#4B5563]">
                                {contest.overview ? (
                                    contest.overview
                                ) : (
                                    <>
                                        Join us for this thrilling competition that brings together innovators, coders, and enthusiasts from around the world. We challenge participants to explore the frontiers of technology and develop groundbreaking applications.
                                        <br/><br/>
                                        {contest.instructions}
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Info Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Eligibility Card */}
                            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 flex items-start gap-3">
                                <Target className="h-5 w-5 text-[#F59E0B] shrink-0" />
                                <div>
                                    <h3 className="text-[13px] font-bold text-[#111827] uppercase tracking-wide mb-1">Eligibility</h3>
                                    <p className="text-[13px] text-[#6B7280] leading-[18px]">
                                        {contest.openForAllColleges && contest.openForAllDepartments 
                                            ? "Open to all students, professionals, and hobbyists aged 18 or older. No geographical restrictions." 
                                            : "Restricted to specific colleges or departments. Please see quick info for details."}
                                    </p>
                                </div>
                            </div>

                            {/* Start Date Card */}
                            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-[#F59E0B] shrink-0" />
                                <div>
                                    <h3 className="text-[13px] font-bold text-[#111827] uppercase tracking-wide mb-1">Start Date & Time</h3>
                                    <p className="text-[13px] text-[#6B7280] leading-[18px]">
                                        {contest.startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}<br/>
                                        {contest.startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            {/* Duration Card */}
                            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 flex items-start gap-3">
                                <Timer className="h-5 w-5 text-[#F59E0B] shrink-0" />
                                <div>
                                    <h3 className="text-[13px] font-bold text-[#111827] uppercase tracking-wide mb-1">Duration</h3>
                                    <p className="text-[13px] text-[#6B7280] leading-[18px]">
                                        {contest.duration >= 1440 
                                            ? `${Math.round(contest.duration / 60)} Hour Intense Sprint` 
                                            : `${contest.duration} Minutes`}<br/>
                                        Virtual/Online
                                    </p>
                                </div>
                            </div>

                            {/* Registration Deadline Card */}
                            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 flex items-start gap-3">
                                <Clock className="h-5 w-5 text-[#EF4444] shrink-0" />
                                <div>
                                    <h3 className="text-[13px] font-bold text-[#111827] uppercase tracking-wide mb-1">Registration Deadline</h3>
                                    <p className="text-[13px] text-[#6B7280] leading-[18px]">
                                        {contest.registrationEndDate ? (
                                            <>
                                                {contest.registrationEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}<br/>
                                                {contest.registrationEndDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </>
                                        ) : (
                                            "Rolling Registration"
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Action Card */}
                        <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-inter font-semibold text-[12px] leading-[14.4px] text-[#5A5A5A]">Total Prize Pool</span>
                                {contest.endDate && new Date() < contest.endDate && (
                                    <div className="flex items-center gap-[4px] bg-[#F5F5F5] rounded-[8px] px-[6px] py-[4px]">
                                        <Calendar size={10} color="#343330" />
                                        <span className="font-inter font-bold text-[10px] leading-[12.4px] text-[#303030]">
                                            {getCountdown(contest.endDate)} Left
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="text-[28px] font-bold text-[#111827] mb-4">
                                {contest.prize || "₹10,000"}
                            </div>

                            <div className="bg-[#E4861A]/10 rounded-[8px] p-[12px] mb-4 flex flex-col gap-[8px]">
                                <h4 className="font-inter font-semibold text-[13px] leading-[16px] text-[#131B2E]">Required Skills</h4>
                                <div className="flex flex-wrap gap-[6px]">
                                    {['Python', 'ML', 'React'].map(skill => (
                                        <span key={skill} className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-[4px] px-[8px] py-[4px] font-inter font-semibold text-[12px] leading-[14.4px] text-[#5A5A5A] flex items-center justify-center">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {!isPast && (
                                <Button
                                    className={cn(
                                        "w-full text-white border-0 h-[36px] flex items-center justify-center gap-[8px] font-inter text-[14px] font-semibold rounded-[8px] transition-all",
                                        contest.isRegistered
                                            ? isLive
                                                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90"
                                                : "bg-gray-400 cursor-not-allowed"
                                            : contest.allowLateEntry && isLive
                                                ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90"
                                                : "bg-gradient-to-r from-[#1A73E8] to-[#6C24B5] hover:opacity-90 shadow-md"
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
                                        <span className="flex items-center gap-2 justify-center w-full">
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Registering...
                                        </span>
                                    ) : contest.isRegistered ? (
                                        isLive ? (
                                            <span className="flex items-center gap-2 justify-center w-full"><Play className="h-5 w-5 fill-current" /> Enter Contest</span>
                                        ) : (
                                            <span className="flex items-center gap-2 justify-center w-full"><CheckCircle2 className="h-5 w-5" /> Registered</span>
                                        )
                                    ) : (
                                        <span className="flex items-center gap-2 justify-center w-full">
                                            {contest.allowLateEntry && isLive ? (
                                                <><Zap className="h-5 w-5 fill-current" /> Late Entry</>
                                            ) : (
                                                <>
                                                    {registrationInfo.state === 'not_started'
                                                        ? 'Registration Opens Soon'
                                                        : registrationInfo.state === 'closed'
                                                            ? 'Registration Closed'
                                                            : 'Register Now'}
                                                    {registrationInfo.state !== 'closed' && registrationInfo.state !== 'not_started' && <ArrowLeft className="h-[16px] w-[16px] rotate-180" />}
                                                </>
                                            )}
                                        </span>
                                    )}
                                </Button>
                            )}
                            
                            {/* Leaderboard below the Action Card if the contest has started or is past */}
                            {(isLive || isPast) && (
                                <div className="mt-6">
                                    <ContestLeaderboard
                                        contestId={contest.id}
                                        contestTitle={contest.title}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ContestDetail;



