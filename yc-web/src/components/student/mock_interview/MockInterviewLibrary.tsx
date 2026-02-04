import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ModernCard from '@/components/common/ModernCard';
import SearchBar from "@/components/common/SearchBar";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Play, Star, Clock, Users } from 'lucide-react';
import Navigation from '@/components/common/Navigation';
import PermissionDialog from './PermissionDialog';
import InterviewScreen from './InterviewScreen';
import ThankYouScreen from './ThankYouScreen';
import ReportsScreen from './ReportsScreen';
import { mockInterviewService, MockInterview as ApiMockInterview } from '@/services/mockInterviewService';

import { Role, InterviewSettings } from '@/types/mockInterview';
import { getLevelBadgeVariant } from '@/utils/mockInterviewUtils';
import { getCourseIconConfig } from '@/utils/CourseIcons';

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
  const [interviewSettings, setInterviewSettings] = useState<InterviewSettings | null>(null);

  const [mockRoles, setMockRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMockInterviews = async () => {
      try {
        const data = await mockInterviewService.getAllMockInterviews();
        const mappedRoles = data.map((item: ApiMockInterview) => {
          // Map difficulty to level (Defaulting to Intermediate as difficulty field is removed)
          let level: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
          // Future: map from description or tags if available

          // Determine icon based on title
          const config = getCourseIconConfig(item.title, item.ai_generation_mode);
          const IconComponent = config.Icon;

          return {
            id: item.id,
            title: item.title,
            description: item.description,
            category: item.ai_generation_mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            level: level,
            max_duration: item.max_duration,
            interviewer_name: item.interviewer_name || 'Junnu',
            interviewer_voice_id: item.interviewer_voice_id || '',
            voice_speed: item.voice_speed || 1.0,
            icon: <IconComponent className="w-6 h-6 text-white" />,
            iconBg: `${config.bg} p-2 rounded-lg`,
            iconColor: config.text,
            buttonGradient: config.gradient || "from-slate-700 to-slate-900"
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

  const filteredRoles = mockRoles.filter(role =>
    role.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    setShowThankYouScreen(true); // Show thank you page when exiting
  };

  const handleInterviewComplete = (role: Role, difficulty: string, duration: string) => {
    setShowInterviewScreen(false);
    setShowThankYouScreen(true);
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

  // Show reports screen if active
  if (showReportsScreen && selectedRole && interviewSettings) {
    return (
      <div className="bg-background min-h-screen">
        <Navigation autoHide={true} />
        <ReportsScreen
          role={selectedRole}
          difficulty={interviewSettings.difficulty}
          duration={interviewSettings.duration}
          onTryAgain={handleTryAgain}
          onBackToLibrary={handleBackToLibrary}
        />
      </div>
    );
  }

  // Show thank you screen if active
  if (showThankYouScreen && selectedRole && interviewSettings) {
    return (
      <div className="bg-background min-h-screen">
        <Navigation autoHide={true} />
        <ThankYouScreen
          role={selectedRole}
          difficulty={interviewSettings.difficulty}
          duration={interviewSettings.duration}
          onViewReports={handleViewReports}
          onTryAgain={handleTryAgain}
          onBackToLibrary={handleBackToLibrary}
        />
      </div>
    );
  }

  // Show interview screen if active
  if (showInterviewScreen && selectedRole && interviewSettings) {
    return (
      <div className="bg-background min-h-screen">
        <Navigation autoHide={true} />
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navigation />
      <div className="px-8 py-6 max-w-[1600px] mx-auto animate-fade-in">
        {/* Header with Search */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="text-left w-full md:w-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Mock Interview
            </h1>
            <p className="text-muted-foreground">
              Choose a role to start practicing your interview skills
            </p>
          </div>

          <div className="w-full md:w-auto min-w-[320px] max-w-md">
            <SearchBar
              searchQuery={searchTerm}
              setSearchQuery={setSearchTerm}
              placeholder="Search roles..."
            />
          </div>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRoles.map((role) => (
            <ModernCard
              key={role.id}
              title={role.title.replace('Mock Interview — ', '')}
              description={role.description}
              icon={role.icon}
              iconClassName={role.iconBg}
              gradientColor={role.buttonGradient || "from-slate-700"}
              tags={[
                {
                  text: role.level,
                  variant: getLevelBadgeVariant(role.level)
                }
              ]}
              footerItems={[
                { icon: <Clock className="w-3.5 h-3.5" />, text: `${role.max_duration} mins` },
                { icon: <Users className="w-3.5 h-3.5" />, text: role.interviewer_name }
              ]}
              actionLabel="Start Practice"
              onAction={() => handleStartPracticeClick(role)}
            />
          ))}
        </div>

        <Dialog open={showModal} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] rounded-2xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl ring-1 ring-black/5 p-0 flex flex-col overflow-hidden">

            {/* styled header matching Profile modal */}
            <DialogHeader className="p-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white flex-shrink-0">
              <div className="flex items-center gap-3 mb-1">
                <div className={`p-2 rounded-lg ${selectedRole?.iconBg?.split(" ")[0] || 'bg-slate-100'}`}>
                  {/* Extract just the bg color class from the composed string if possible, or just use iconBg if it works as wrapper class */}
                  {/* Actually iconBg is now "bg-blue-500 p-2 rounded-lg". So we can just use it on the wrapper div? 
                       But selectedRole.icon is the <Icon>. 
                       The current modal code wraps it in a div with iconBg. 
                       If I use existing iconBg which includes p-2 rounded-lg, I should just apply it.
                   */}
                  {selectedRole?.icon}
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
                    { label: 'Beginner (0-1 yrs)', value: 'beginner' },
                    { label: 'Intermediate (1-3 yrs)', value: '1_3_years' },
                    { label: 'Experienced (3+ yrs)', value: '3_plus_years' }
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
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 px-8 py-6 font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Interview
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
      </div>
    </div>
  );
};

export default MockInterviewLibrary;