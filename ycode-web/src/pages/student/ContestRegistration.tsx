import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/common/DashboardLayout';
import PublicLayout from '@/components/common/PublicLayout';
import { Button } from '@/components/ui/button';
import {
    Trophy, ChevronLeftCircle, ChevronRight, X, Loader2, ChevronLeft, Check, Globe, Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchContests, contestService } from "@/services/contestService";
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

// Predefined skill suggestions
const SKILL_SUGGESTIONS = [
    'React', 'NodeJS', 'MongoDB', 'Python', 'Java', 'JavaScript', 'TypeScript',
    'C++', 'C', 'Go', 'Rust', 'SQL', 'PostgreSQL', 'MySQL', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'Linux',
    'HTML', 'CSS', 'TailwindCSS', 'Next.js', 'Vue.js', 'Angular',
    'Django', 'Flask', 'Spring Boot', 'Express.js', 'GraphQL', 'REST API',
    'Machine Learning', 'Deep Learning', 'Data Science', 'AI',
    'Flutter', 'React Native', 'Swift', 'Kotlin',
];

interface Contest {
    id: number | string;
    title: string;
    organizer: string;
    type: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
    openForAllColleges?: boolean;
    paymentType?: 'paid' | 'unpaid';
}

const inputClass = "w-full h-[56px] min-w-[120px] rounded-[8px] border border-[#757575] bg-white py-[12px] px-[16px] font-inter text-[14px] font-normal leading-[100%] tracking-[0%] text-[#111827] placeholder:text-[#757575] placeholder:font-normal focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/20 transition-all";
const inputErrorClass = "border-red-400 focus:border-red-500 focus:ring-red-500/20";

const ContestRegistration: React.FC = () => {
    const { contestId } = useParams<{ contestId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const isPublic = location.pathname.startsWith('/public/');
    const basePath = isPublic ? '/public/contests' : '/student/contests';
    const Layout: React.FC<any> = isPublic ? PublicLayout : DashboardLayout;
    const skillInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuth();

    const [contest, setContest] = useState<Contest | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [college, setCollege] = useState('');
    const [semester, setSemester] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // OTP and flow state
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otp, setOtp] = useState('');
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [yhubToken, setYhubToken] = useState<string | null>(null);

    // Validation state
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!isPublic && user?.email) {
            setEmail(user.email);
        }
    }, [isPublic, user]);

    useEffect(() => {
        const loadContest = async () => {
            if (!contestId) return;
            try {
                const found = isPublic 
                    ? await contestService.getPublicContest(contestId)
                    : await contestService.getContest(contestId);

                if (found) {
                    setContest({
                        id: found.id,
                        title: found.title,
                        organizer: found.organizer || found.created_by_name || 'Unknown',
                        type: found.type || 'general',
                        startDate: new Date(found.start_datetime || found.start_date),
                        endDate: (found.end_datetime || found.end_date) ? new Date(found.end_datetime || found.end_date) : undefined,
                        description: found.description,
                        openForAllColleges: found.open_for_all_colleges ?? true,
                        paymentType: found.payment_type,
                    });
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

    // Filter suggestions based on current input
    const filteredSuggestions = SKILL_SUGGESTIONS.filter(
        s => s.toLowerCase().includes(skillInput.toLowerCase()) && !skills.includes(s)
    ).slice(0, 6);

    const handleAddSkill = (skill?: string) => {
        const trimmed = (skill || skillInput).trim();
        if (trimmed && !skills.includes(trimmed)) {
            setSkills([...skills, trimmed]);
            setSkillInput('');
            setShowSuggestions(false);
            if (errors.skills) {
                setErrors(prev => ({ ...prev, skills: '' }));
            }
        }
    };

    const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSkill();
        }
        if (e.key === 'Backspace' && !skillInput && skills.length > 0) {
            setSkills(skills.slice(0, -1));
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setSkills(skills.filter(s => s !== skillToRemove));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!fullName.trim()) newErrors.fullName = 'Required';
        if (!email.trim()) {
            newErrors.email = 'Required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Invalid email';
        }
        if (!phone.trim()) {
            newErrors.phone = 'Required';
        } else if (!/^[0-9]{10}$/.test(phone)) {
            newErrors.phone = 'Must be exactly 10 digits';
        }
        if (!college.trim()) newErrors.college = 'Required';
        if (!semester.trim()) newErrors.semester = 'Required';
        if (skills.length === 0) newErrors.skills = 'Add at least one skill';
        if (otpSent && otp.length !== 6) newErrors.otp = 'Enter 6-digit OTP';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSendOtp = async () => {
        if (!email.trim()) {
            setErrors(prev => ({ ...prev, email: 'Enter your email first' }));
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setErrors(prev => ({ ...prev, email: 'Invalid email' }));
            return;
        }
        try {
            setSendingOtp(true);
            
            // First check if email is already registered for this contest
            await contestService.checkRegistration(contestId!, email);
            
            await contestService.sendRegistrationOtp(contestId!, email, contest?.title);
            setOtpSent(true);
            toast.success('OTP sent to your email!');
        } catch (err: any) {
            const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to send OTP. Please try again.';
            if (errorMessage.toLowerCase().includes('exist') || errorMessage.toLowerCase().includes('already')) {
                setErrors(prev => ({ ...prev, email: errorMessage }));
            }
            toast.error(errorMessage);
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            setErrors(prev => ({ ...prev, otp: 'Enter complete 6-digit OTP' }));
            return;
        }
        try {
            setVerifyingOtp(true);
            const response = await contestService.verifyRegistrationOtp(contestId!, email, otp);
            if (response.access_token) {
                setYhubToken(response.access_token);
            }
            setOtpVerified(true);
            setErrors(prev => ({ ...prev, otp: '' }));
            toast.success('Email verified successfully!');
        } catch (err) {
            setErrors(prev => ({ ...prev, otp: 'Invalid OTP. Please try again.' }));
            toast.error('Invalid OTP');
        } finally {
            setVerifyingOtp(false);
        }
    };

    const handleSubmit = async () => {
        if (!validate() || !contestId) return;

        try {
            setSubmitting(true);
            const details = { fullName, email, phone, college, semester, skills };

            if (isPublic) {
                // Verify OTP with YHub first to get JWT
                let currentToken = yhubToken;
                if (!currentToken) {
                    try {
                        const verifyRes = await contestService.verifyRegistrationOtp(contestId, email, otp);
                        if (verifyRes.access_token) {
                            currentToken = verifyRes.access_token;
                            setYhubToken(currentToken);
                        } else {
                            throw new Error('Verification failed, no token received');
                        }
                    } catch (err: any) {
                        toast.error('Invalid OTP or verification failed.');
                        setSubmitting(false);
                        return;
                    }
                }

                // Unauthenticated: use public registration API with YHub token
                const response = await contestService.registerPublicContest(contestId, email, otp, details, currentToken || undefined);
                if (response.status === 'success') {
                    toast.success('Successfully registered for the contest!');
                    setIsRegistered(true);
                } else if (response.status === 'payment_required') {
                    navigate(`${basePath}/${contestId}/payment?token=${currentToken}`);
                } else {
                    toast.error(response.message || 'Registration failed');
                }
            } else {
                // Authenticated: use normal flow
                const response = await contestService.registerContest(contestId);
                if (response.status === 'success' || response.status === 'registered') {
                    toast.success('Successfully registered for the contest!');
                    navigate(`${basePath}/${contestId}`);
                } else if (response.status === 'payment_required') {
                    navigate(`${basePath}/${contestId}/payment?token=${response.payment_token}`);
                } else {
                    toast.error(response.error || response.message || 'Registration failed');
                }
            }
        } catch (err: any) {
            console.error("Registration failed", err);
            const errorMessage = err?.response?.data?.error
                || err?.response?.data?.message
                || err?.message
                || 'Failed to register. Please try again.';
            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (skillInputRef.current && !skillInputRef.current.closest('.skills-container')?.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            </Layout>
        );
    }

    if (!contest) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <p className="text-gray-500 text-lg">Contest not found</p>
                    <Button onClick={() => navigate(basePath)} variant="outline">
                        Back to Contests
                    </Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="mx-auto max-w-[1440px] px-4 sm:px-8 py-8 font-inter">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 mb-6 w-fit font-inter">
                    {!isPublic && (
                        <>
                            <span
                                className="text-[14px] leading-[16.8px] text-[#757575] font-normal cursor-pointer hover:text-gray-900"
                                onClick={() => navigate(basePath)}
                            >
                                Contests
                            </span>
                            <ChevronRight size={14} color="#757575" strokeWidth={2} />
                        </>
                    )}
                    <span
                        className="text-[14px] leading-[16.8px] text-[#757575] font-normal cursor-pointer hover:text-gray-900"
                        onClick={() => navigate(`${basePath}/${contestId}`)}
                    >
                        Details
                    </span>
                    <ChevronRight size={14} color="#757575" strokeWidth={2} />
                    <span className="text-[14px] leading-[16.8px] text-[#343330] font-semibold">
                        Registration
                    </span>
                </div>

                {/* Hero Banner */}
                <div className="relative w-full mx-auto rounded-[8px] overflow-hidden mb-[28px] flex items-center min-h-[116px]" style={{ maxWidth: '1086px' }}>
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: "url('/images/contest-registration-bg.jpg')" }}
                    >
                        <div className="absolute inset-0 bg-[#000000]/[0.22]"></div>
                    </div>

                    <div className="relative z-10 w-full p-[20px] flex items-center justify-between">
                        <div className="flex flex-col gap-[4px]">
                            <h1 className="font-manrope text-[40px] leading-[48px] font-bold text-[#F5F5F5] tracking-[-0.01em]">
                                Participation Registration
                            </h1>
                            <p className="font-inter text-[16px] leading-[19.2px] font-medium text-[#F3F3F3]">
                                To participate, kindly complete the form provided below.
                            </p>
                        </div>
                        {contest.openForAllColleges && (
                            <div className="shrink-0 inline-flex items-center gap-[2px] pt-[4px] pr-[10px] pb-[4px] pl-[8px] rounded-[16px] border border-[#B2B2B2]/[0.13] bg-[#FFFFFF]/[0.10] backdrop-blur-sm text-white font-inter text-[13px] leading-[16px] font-medium">
                                <Globe size={14} />
                                Open to All
                            </div>
                        )}
                    </div>
                </div>

                {/* Registration Form Card */}
                {/* Registration Form Card */}
                <div 
                    className="rounded-[24px] border border-[#E5E7EB] bg-white p-[20px] shadow-[0_0_10px_rgba(0,0,0,0.15)] mx-auto font-inter transition-all duration-300" 
                    style={{ maxWidth: isRegistered ? '540px' : '1086px' }}
                >
                    
                    {isRegistered ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-manrope font-semibold text-gray-900 mb-3">Registration Successful!</h3>
                            <p className="text-gray-600 mb-8 max-w-sm text-base font-inter">
                                You have successfully registered for <b>{contest?.title}</b>. We've recorded your details and you're all set to participate.
                            </p>
                            <button
                                onClick={() => navigate(basePath)}
                                className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-base transition-colors shadow-sm"
                            >
                                Back to Contests
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Participation Type */}
                            <div className="flex items-center gap-[32px] mb-[24px]">
                                <div className="h-[24px] font-inter font-normal text-[16px] leading-[24px] text-[#000626]/90 flex items-center whitespace-nowrap">
                                    Participation Type: <span className="text-[#EF4444] ml-1">*</span>
                                </div>
                                <div className="flex items-center gap-[8px]">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" fill="#E68212"/>
                                        <circle cx="12" cy="12" r="4" fill="white"/>
                                    </svg>
                                    <span className="font-inter font-normal text-[16px] leading-[20px] text-[#1E1E1E]">Individual</span>
                                </div>
                            </div>

                            {/* Form Fields — 2-column grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
                                {/* Row 1: Full Name | Email */}
                                <div className="flex flex-col gap-1">
                                    <input
                                        id="fullName"
                                        placeholder="Full Name*"
                                        value={fullName}
                                        onChange={(e) => {
                                            setFullName(e.target.value);
                                            if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                                        }}
                                        className={cn(inputClass, errors.fullName && inputErrorClass)}
                                    />
                                    {errors.fullName && <p className="text-[11px] text-red-500">{errors.fullName}</p>}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="Email*"
                                        value={email}
                                        readOnly={!isPublic}
                                        onChange={(e) => {
                                            if (!isPublic) return;
                                            setEmail(e.target.value);
                                            if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                                        }}
                                        className={cn(
                                            inputClass, 
                                            errors.email && inputErrorClass,
                                            !isPublic && "bg-gray-100 text-gray-500 cursor-not-allowed opacity-80"
                                        )}
                                    />
                                    {errors.email && <p className="text-[11px] text-red-500">{errors.email}</p>}
                                </div>

                                {/* Row 2: Phone No. | College/University Name */}
                                <div className="flex flex-col gap-1">
                                    <input
                                        id="phone"
                                        type="tel"
                                        placeholder="Phone No.*"
                                        value={phone}
                                        maxLength={10}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setPhone(val);
                                            if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                        }}
                                        className={cn(inputClass, errors.phone && inputErrorClass)}
                                    />
                                    {errors.phone && <p className="text-[11px] text-red-500">{errors.phone}</p>}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <input
                                        id="college"
                                        placeholder="College/ University Name*"
                                        value={college}
                                        onChange={(e) => {
                                            setCollege(e.target.value);
                                            if (errors.college) setErrors(prev => ({ ...prev, college: '' }));
                                        }}
                                        className={cn(inputClass, errors.college && inputErrorClass)}
                                    />
                                    {errors.college && <p className="text-[11px] text-red-500">{errors.college}</p>}
                                </div>

                                {/* Row 3: Semester/Year | Skills */}
                                <div className="flex flex-col gap-1">
                                    <input
                                        id="semester"
                                        placeholder="Semester/ Year*"
                                        value={semester}
                                        onChange={(e) => {
                                            setSemester(e.target.value);
                                            if (errors.semester) setErrors(prev => ({ ...prev, semester: '' }));
                                        }}
                                        className={cn(inputClass, errors.semester && inputErrorClass)}
                                    />
                                    {errors.semester && <p className="text-[11px] text-red-500">{errors.semester}</p>}
                                </div>
                                <div className="relative flex flex-col gap-1 skills-container">
                                    <div
                                        className={cn(
                                            "flex flex-wrap items-center gap-[6px] min-h-[56px] min-w-[120px] rounded-[8px] border border-[#757575] bg-white py-[12px] px-[16px] transition-all focus-within:border-[#6366F1] focus-within:ring-1 focus-within:ring-[#6366F1]/20",
                                            errors.skills && inputErrorClass
                                        )}
                                    >
                                        {skills.map((skill) => (
                                            <span
                                                key={skill}
                                                className="inline-flex items-center gap-[4px] px-[8px] py-[4px] rounded-[4px] bg-[#D9D9D9] font-inter font-normal text-[14px] text-[#1E1E1E]"
                                            >
                                                {skill}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSkill(skill)}
                                                    className="flex items-center justify-center text-[#1E1E1E] hover:text-black transition-colors"
                                                >
                                                    <X size={14} strokeWidth={2} />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            ref={skillInputRef}
                                            id="skills"
                                            type="text"
                                            placeholder={skills.length === 0 ? "Skills*" : ""}
                                            value={skillInput}
                                            onChange={(e) => {
                                                setSkillInput(e.target.value);
                                                setShowSuggestions(true);
                                                if (errors.skills) setErrors(prev => ({ ...prev, skills: '' }));
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            onKeyDown={handleSkillKeyDown}
                                            className="flex-1 min-w-[80px] bg-transparent text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none border-none p-0"
                                        />
                                    </div>
                                    {errors.skills && <p className="text-[11px] text-red-500">{errors.skills}</p>}

                                    {/* Skill Suggestions Dropdown */}
                                    {showSuggestions && skillInput.trim().length > 0 && filteredSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[8px] border border-[#E5E7EB] shadow-lg z-20 max-h-[200px] overflow-y-auto">
                                            {filteredSuggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion}
                                                    type="button"
                                                    onClick={() => {
                                                        handleAddSkill(suggestion);
                                                        skillInputRef.current?.focus();
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 text-[13px] text-[#374151] hover:bg-[#F3F4F6] transition-colors first:rounded-t-[8px] last:rounded-b-[8px]"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-[16px] mt-[24px]">
                                <button
                                    onClick={() => navigate(basePath)}
                                    className="inline-flex items-center justify-center gap-[8px] w-[296px] h-[48px] rounded-[8px] border border-[#767676] bg-white p-[12px] hover:bg-[#F9FAFB] transition-all ease-in-out duration-200"
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10.5 2.5L4.5 8L10.5 13.5" stroke="#343330" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span className="font-inter font-normal text-[16px] leading-[100%] tracking-[0%] text-[#1E1E1E]">
                                        Back
                                    </span>
                                </button>
                                
                                {!isPublic ? (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="flex-1 inline-flex items-center justify-center gap-[8px] h-[48px] rounded-[8px] bg-gradient-to-r from-[#1A73E8] to-[#8C24B5] hover:from-[#1565D8] hover:to-[#7B1FA2] text-white transition-all disabled:opacity-60"
                                    >
                                        {submitting ? (
                                            <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                                        ) : (
                                            <span className="font-semibold text-[14px]">
                                                {contest?.paymentType === 'paid' ? 'Proceed to Payment' : 'Register'}
                                            </span>
                                        )}
                                    </button>
                                ) : !otpSent ? (
                                    <button
                                        onClick={() => {
                                            if (validate()) {
                                                handleSendOtp();
                                            }
                                        }}
                                        disabled={sendingOtp}
                                        className="flex-1 inline-flex items-center justify-center gap-[8px] h-[48px] rounded-[8px] bg-gradient-to-r from-[#1A73E8] to-[#8C24B5] hover:from-[#1565D8] hover:to-[#7B1FA2] text-white transition-all disabled:opacity-60"
                                    >
                                        {sendingOtp ? (
                                            <><Loader2 className="h-5 w-5 animate-spin" /> Sending OTP...</>
                                        ) : (
                                            <span className="font-semibold text-[14px]">Send OTP</span>
                                        )}
                                    </button>
                                ) : (
                                    <div className="flex-1 flex flex-row items-center gap-[16px] bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                                        <div className="flex-1 flex flex-col gap-1 items-center justify-center">
                                            <h4 className="font-manrope text-sm font-semibold text-gray-800">Enter OTP sent to {email}</h4>
                                            <InputOTP
                                                maxLength={6}
                                                value={otp}
                                                onChange={(value) => {
                                                    setOtp(value);
                                                    if (errors.otp) setErrors(prev => ({ ...prev, otp: '' }));
                                                }}
                                            >
                                                <InputOTPGroup className="gap-2">
                                                    <InputOTPSlot index={0} className="w-10 h-12 text-lg rounded-lg border-none bg-gray-100 shadow-sm focus-visible:ring-indigo-500" />
                                                    <InputOTPSlot index={1} className="w-10 h-12 text-lg rounded-lg border-none bg-gray-100 shadow-sm focus-visible:ring-indigo-500" />
                                                    <InputOTPSlot index={2} className="w-10 h-12 text-lg rounded-lg border-none bg-gray-100 shadow-sm focus-visible:ring-indigo-500" />
                                                    <InputOTPSlot index={3} className="w-10 h-12 text-lg rounded-lg border-none bg-gray-100 shadow-sm focus-visible:ring-indigo-500" />
                                                    <InputOTPSlot index={4} className="w-10 h-12 text-lg rounded-lg border-none bg-gray-100 shadow-sm focus-visible:ring-indigo-500" />
                                                    <InputOTPSlot index={5} className="w-10 h-12 text-lg rounded-lg border-none bg-gray-100 shadow-sm focus-visible:ring-indigo-500" />
                                                </InputOTPGroup>
                                            </InputOTP>
                                            <div className="flex items-center justify-between w-full max-w-[280px] mt-1 px-1">
                                                <div className="flex-1">
                                                    {errors.otp && <p className="text-[11px] text-red-500">{errors.otp}</p>}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleSendOtp}
                                                    disabled={sendingOtp}
                                                    className="text-[12px] font-medium text-[#1A73E8] hover:text-[#1565D8] disabled:opacity-50 whitespace-nowrap ml-2"
                                                >
                                                    {sendingOtp ? 'Resending...' : 'Resend OTP'}
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting || otp.length !== 6}
                                            className="shrink-0 inline-flex items-center justify-center gap-[8px] h-[48px] px-[24px] rounded-[8px] bg-gradient-to-r from-[#1A73E8] to-[#8C24B5] hover:from-[#1565D8] hover:to-[#7B1FA2] text-white transition-all disabled:opacity-60"
                                        >
                                            {submitting ? (
                                                <><Loader2 className="h-5 w-5 animate-spin" /> Verifying...</>
                                            ) : (
                                                <span className="font-semibold text-[14px]">
                                                    {contest?.paymentType === 'paid' ? 'Verify and Proceed to Payment' : 'Verify & Register'}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default ContestRegistration;
