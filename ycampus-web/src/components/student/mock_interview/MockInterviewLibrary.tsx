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
    setSelectedDifficulty('beginner');
    setSelectedDuration(`${role.max_duration} mins`);
    setShowPermissionDialog(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRole(null);
  };

  const handleProceedWithInterview = async () => {
    console.log('Proceeding with interview');
    try {
      // Request actual media stream for the interview
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      const settings: InterviewSettings = {
        difficulty: selectedDifficulty || 'beginner',
        duration: selectedDuration || '30 mins',
        interviewer: selectedRole?.interviewer_name || 'Junnu',
        mediaStream: stream,
        resume: resumeFile || undefined
      };

      setInterviewSettings(settings);
      setShowPermissionDialog(false);
      setShowInterviewScreen(true);
    } catch (error) {
      console.error('Failed to get media permissions for interview:', error);
      alert('Camera and microphone access is required. Please grant permissions and try again.');
    }
  };

  const resetInterviewState = () => {
    // Stop media stream if exists
    if (interviewSettings?.mediaStream) {
      interviewSettings.mediaStream.getTracks().forEach(track => track.stop());
    }
    setInterviewSettings(null);
    setSelectedRole(null);
    setSessionId(null);
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
    setShowReportsScreen(true);
  };

  const handleInterviewComplete = (role: Role, difficulty: string, duration: string, sessionId: string) => {
    setSessionId(sessionId);
    setShowInterviewScreen(false);
    setShowReportsScreen(true);
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