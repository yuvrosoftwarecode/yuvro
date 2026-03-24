import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ModernCard from '@/components/common/ModernCard';
import SearchBar from "@/components/common/SearchBar";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Play, Star, Clock, Users } from 'lucide-react';
import RoleSidebar from '@/components/common/RoleSidebar';
import InterviewRoleCard from '@/components/common/InterviewRoleCard';
import PermissionDialog from './PermissionDialog';
import InterviewScreen from './InterviewScreen';
import ThankYouScreen from './ThankYouScreen';
import ReportsScreen from './ReportsScreen';
import { mockInterviewService, MockInterview as ApiMockInterview } from '@/services/mockInterviewService';

import { Role, InterviewSettings } from '@/types/mockInterview';
import { getRoleIconConfig, getLevelBadgeVariant } from '@/utils/mockInterviewUtils';

interface MockInterviewLibraryProps {
  onStartInterview?: (role: Role, settings: any) => void;
}

const MockInterviewLibrary: React.FC<MockInterviewLibraryProps> = ({ onStartInterview }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showInterviewScreen, setShowInterviewScreen] = useState(false);
  const [showThankYouScreen, setShowThankYouScreen] = useState(false);
  const [showReportsScreen, setShowReportsScreen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [interviewSettings, setInterviewSettings] = useState<InterviewSettings | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [mockRoles, setMockRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMockInterviews = async () => {
      try {
        const data = await mockInterviewService.getAllMockInterviews();
        const mappedRoles = data.map((item: ApiMockInterview) => {
          let level: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
          
          // Design mapping based on Image 2
          const getDesignConfig = (title: string) => {
            const t = title.toLowerCase();
            if (t.includes('dsa')) return { gradient: 'from-orange-500 to-rose-500', category: 'Product Based', questions: 15 };
            if (t.includes('python')) return { gradient: 'from-blue-500 to-indigo-600', category: 'Product Based', questions: 12 };
            if (t.includes('java')) return { gradient: 'from-red-500 to-pink-500', category: 'Product Based', questions: 18 };
            if (t.includes('system design')) return { gradient: 'from-purple-500 to-indigo-500', category: 'Product Based', questions: 10 };
            if (t.includes('aptitude')) return { gradient: 'from-emerald-500 to-teal-500', category: 'Startup', questions: 20 };
            if (t.includes('logical')) return { gradient: 'from-amber-400 to-orange-500', category: 'Startup', questions: 15 };
            if (t.includes('communication')) return { gradient: 'from-sky-400 to-blue-500', category: 'Startup', questions: 5 };
            if (t.includes('dbms')) return { gradient: 'from-cyan-400 to-blue-600', category: 'Startup', questions: 12 };
            return { gradient: 'from-slate-500 to-slate-700', category: 'Service Based', questions: 10 };
          };

          const design = getDesignConfig(item.title);
          const { icon, iconBg, iconColor } = getRoleIconConfig(item.title);

          return {
            id: item.id,
            title: item.title.replace('Mock Interview — ', ''),
            description: item.description,
            category: design.category,
            level: level,
            max_duration: item.max_duration,
            interviewer_name: item.interviewer_name || 'Junnu',
            interviewer_voice_id: item.interviewer_voice_id || '',
            voice_speed: item.voice_speed || 1.0,
            icon: icon,
            iconBg: iconBg,
            iconColor: iconColor,
            buttonGradient: design.gradient,
            questionCount: design.questions
          };
        });
        setMockRoles(mappedRoles);
      } catch (error) {
        console.error("Failed to fetch mock interviews", error);
        // Fallback to empty or toast error
      } finally {
        setLoading(false);
      }
    };

    fetchMockInterviews();
  }, []);

  const filteredRoles = mockRoles.filter(role => {
    const matchesSearch = role.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          role.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || role.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleStartPracticeClick = (role: Role) => {
    setSelectedRole(role);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    console.log('Closing modal');
    setShowModal(false);
    setSelectedRole(null);
    setSelectedDifficulty('');
    setSelectedDuration('');
    setResumeFile(null);
    setAgreeToTerms(false);
  };

  const handleProceedWithInterview = () => {
    console.log('Proceeding with interview');
    setShowPermissionDialog(false);
    setShowInterviewScreen(true);
  };

  const resetInterviewState = () => {
    // Stop media stream if exists
    if (interviewSettings?.mediaStream) {
      interviewSettings.mediaStream.getTracks().forEach(track => track.stop());
    }
    setInterviewSettings(null);
    setSelectedRole(null);
    setSessionId(null); // Reset session ID
    setShowInterviewScreen(false);
    setShowThankYouScreen(false);
    setShowReportsScreen(false);
    setShowPermissionDialog(false);
  }

  const handleCancelInterview = () => {
    console.log('Canceling interview');
    resetInterviewState();
  };

  const handleExitInterview = () => {
    setShowInterviewScreen(false);
    setShowReportsScreen(true); // Go directly to report
  };

  const handleInterviewComplete = (role: Role, difficulty: string, duration: string, sessionId: string) => {
    setSessionId(sessionId);
    setShowInterviewScreen(false);
    setShowReportsScreen(true); // Go directly to report
  };

  const handleViewReports = () => {
    setShowThankYouScreen(false);
    setShowReportsScreen(true);
  };

  const handleTryAgain = () => {
    setShowThankYouScreen(false);
    setShowReportsScreen(false);
    setShowInterviewScreen(true);
  };

  const handleBackToLibrary = () => {
    resetInterviewState();
  };

  const handleStartInterview = async () => {
    console.log('handleStartInterview called');
    if (!selectedDifficulty || !selectedDuration || !agreeToTerms) {
      alert('Please fill in all required fields and agree to terms.');
      return;
    }

    try {
      console.log('Requesting media permissions...');
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      console.log('Permissions granted, stream received:', stream);
      // If we get here, permissions were granted
      const settings: InterviewSettings = {
        difficulty: selectedDifficulty,
        duration: selectedDuration,
        interviewer: selectedRole?.interviewer_name || 'Junnu',
        mediaStream: stream,
        resume: resumeFile || undefined
      };

      console.log('Setting interview settings and showing permission dialog');
      setInterviewSettings(settings);

      // Close modal but keep selectedRole
      setShowModal(false);
      setSelectedDifficulty('');
      setSelectedDuration('');
      setResumeFile(null);
      setAgreeToTerms(false);

      // Use setTimeout to ensure modal is closed before showing permission dialog
      setTimeout(() => {
        console.log('Setting showPermissionDialog to true');
        setShowPermissionDialog(true);
      }, 100);

    } catch (error) {
      console.error('Failed to get media permissions:', error);
      alert('Camera and microphone access is required for the interview. Please grant permissions and try again.');
    }
  };

  // Show interview screen if active (FULL SCREEN - No Sidebar)
  if (showInterviewScreen && selectedRole && interviewSettings) {
    return (
      <InterviewScreen
        role={selectedRole}
        difficulty={interviewSettings.difficulty}
        duration={interviewSettings.duration}
        interviewer={interviewSettings.interviewer}
        mediaStream={interviewSettings.mediaStream}
        resume={interviewSettings.resume}
        onExit={handleExitInterview}
        onInterviewComplete={handleInterviewComplete}
      />
    );
  }

  let content;

  if (showReportsScreen && selectedRole && interviewSettings && sessionId) {
    content = (
      <ReportsScreen
        role={selectedRole}
        difficulty={interviewSettings.difficulty}
        duration={interviewSettings.duration}
        sessionId={sessionId}
        onTryAgain={handleTryAgain}
        onBackToLibrary={handleBackToLibrary}
      />
    );
  } else if (showThankYouScreen && selectedRole && interviewSettings) {
    content = (
      <ThankYouScreen
        role={selectedRole}
        difficulty={interviewSettings.difficulty}
        duration={interviewSettings.duration}
        onViewReports={handleViewReports}
        onTryAgain={handleTryAgain}
        onBackToLibrary={handleBackToLibrary}
      />
    );
  } else {
    content = (
      <div className="px-8 py-10 max-w-[1400px] mx-auto animate-fade-in space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="text-left">
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
              Interview Library
            </h1>
            <p className="text-slate-500 font-medium">
              View courses tailored for specific roles.
            </p>
          </div>

          <div className="w-full md:w-auto min-w-[320px]">
            <SearchBar
              searchQuery={searchTerm}
              setSearchQuery={setSearchTerm}
              placeholder="Search by topic..."
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3">
          {['All', 'Product Based', 'Service Based', 'Startup'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                  : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-white border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRoles.map((role) => (
            <InterviewRoleCard
              key={role.id}
              title={role.title}
              description={role.description}
              icon={role.icon}
              gradient={role.buttonGradient || "from-slate-500 to-slate-700"}
              duration={role.max_duration}
              questionCount={(role as any).questionCount || 10}
              category={role.category}
              onStart={() => handleStartPracticeClick(role)}
            />
          ))}
        </div>

        {/* No Results */}
        {filteredRoles.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">No interviews found</h3>
            <p className="text-slate-500">Try adjusting your search or category filters</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <RoleSidebar />
      <main className="flex-1 h-screen overflow-y-auto">
        {content}
        <Dialog open={showModal} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] rounded-2xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl ring-1 ring-black/5 p-0 flex flex-col overflow-hidden">
            {/* styled header matching Profile modal */}
            <DialogHeader className="p-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white flex-shrink-0">
              <div className="flex items-center gap-3 mb-1">
                <div className={`p-2 rounded-lg ${selectedRole?.iconBg || 'bg-slate-100'}`}>
                  <span className="text-xl">{selectedRole?.icon}</span>
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    {selectedRole?.title}
                  </DialogTitle>
                  <p className="text-xs font-semibold text-blue-600 tracking-wider uppercase mt-1">
                    {selectedRole?.category}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
              {/* Difficulty Level */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Experience Level</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Intern', value: 'intern' },
                    { label: 'Fresher (0-1 yrs)', value: 'beginner' },
                    { label: 'Junior (1-3 yrs)', value: '1_3_years' },
                    { label: 'Professional (3+ yrs)', value: '3_plus_years' }
                  ].map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setSelectedDifficulty(level.value)}
                      className={`
                        relative px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border text-left
                        ${selectedDifficulty === level.value
                          ? 'border-blue-500/30 bg-blue-50/50 text-blue-700 ring-4 ring-blue-500/10'
                          : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-white hover:border-slate-300'
                        }
                      `}
                    >
                      {level.label}
                      {selectedDifficulty === level.value && (
                        <div className="absolute top-1/2 right-3 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interview Duration */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interview Duration</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(() => {
                    const max = selectedRole?.max_duration || 60;
                    const options = [];
                    if (max >= 15) options.push({ value: '15 mins', label: '15 Mins', minutes: 15 });
                    if (max >= 30) options.push({ value: '30 mins', label: '30 Mins', minutes: 30 });
                    if (max >= 45) options.push({ value: '45 mins', label: '45 Mins', minutes: 45 });
                    if (!options.find(o => o.minutes === max) && max > 0) {
                      options.push({ value: `${max} mins`, label: `${max} Mins`, minutes: max });
                    }
                    options.sort((a, b) => a.minutes - b.minutes);

                    return options.map((duration) => (
                      <button
                        key={duration.value}
                        onClick={() => setSelectedDuration(duration.value)}
                        className={`
                          relative px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border text-center
                          ${selectedDuration === duration.value
                            ? 'border-blue-500/30 bg-blue-50/50 text-blue-700 ring-4 ring-blue-500/10'
                            : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-white hover:border-slate-300'
                          }
                        `}
                      >
                        {duration.label}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Resume Upload */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resume (Optional)</h4>
                <div className={`
                    group border-2 border-dashed rounded-xl p-6 transition-colors text-center cursor-pointer
                    ${resumeFile ? 'border-blue-500/30 bg-blue-50/30' : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'}
                `}>
                  <input
                    type="file"
                    id="resume-upload"
                    accept=".pdf"
                    onChange={(e) => setResumeFile(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer w-full h-full block">
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-2 text-blue-700">
                        <span className="text-sm font-medium line-clamp-1">{resumeFile.name}</span>
                        <button
                          onClick={(e) => { e.preventDefault(); setResumeFile(null); }}
                          className="p-1 hover:bg-blue-100 rounded-full"
                        >
                          <span className="sr-only">Remove</span>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-center text-slate-400 group-hover:text-slate-500 transition-colors">
                          <Search className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Click to upload your resume (PDF)</p>
                        <p className="text-xs text-slate-400">Helps AI tailor questions to your experience</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Terms */}
              <div className="pt-4 border-t border-slate-100">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`
                    mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors
                    ${agreeToTerms ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 bg-white group-hover:border-slate-400'}
                  `}>
                    {agreeToTerms && <span className="text-xs">✓</span>}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                  />
                  <span className="text-sm text-slate-600 select-none">
                    I agree to the <span className="text-blue-600 font-medium hover:underline">Terms & Conditions</span> regarding the recording and processing of my interview session.
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={handleCloseModal}
                className="rounded-xl hover:bg-slate-200 text-slate-500 font-medium px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartInterview}
                disabled={!selectedDifficulty || !selectedDuration || !agreeToTerms}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 px-10 py-7 font-black tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 group/btn"
              >
                <Play className="h-5 w-5 mr-3 group-hover/btn:scale-110 transition-transform" />
                START INTERVIEW
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Permission Dialog */}
        <PermissionDialog
          open={showPermissionDialog}
          onConfirm={handleProceedWithInterview}
          onCancel={handleCancelInterview}
        />
      </main>
    </div>
  );
};

export default MockInterviewLibrary;