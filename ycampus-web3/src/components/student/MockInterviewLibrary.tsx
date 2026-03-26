import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Play, Star, Clock, Users } from 'lucide-react';
import PermissionDialog from './PermissionDialog';
import InterviewScreen from './InterviewScreen';
import ThankYouScreen from './ThankYouScreen';
import ReportsScreen from './ReportsScreen';

interface Role {
  id: number;
  title: string;
  description: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
}

interface MockInterviewLibraryProps {
  onStartInterview?: (role: Role, settings: any) => void;
}

interface InterviewSettings {
  difficulty: string;
  duration: string;
  interviewer: string;
  mediaStream: MediaStream;
}

const MockInterviewLibrary: React.FC<MockInterviewLibraryProps> = ({ onStartInterview }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [selectedInterviewer, setSelectedInterviewer] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showInterviewScreen, setShowInterviewScreen] = useState(false);
  const [showThankYouScreen, setShowThankYouScreen] = useState(false);
  const [showReportsScreen, setShowReportsScreen] = useState(false);
  const [interviewSettings, setInterviewSettings] = useState<InterviewSettings | null>(null);

  const mockRoles: Role[] = [
    {
      id: 1,
      title: "Java Developer",
      description: "Master Java programming fundamentals, object-oriented design, and enterprise development patterns.",
      category: "Programming",
      level: "Intermediate"
    },
    {
      id: 2,
      title: "Python Developer", 
      description: "Learn Python programming, data structures, algorithms, and web development with Django/Flask.",
      category: "Programming",
      level: "Beginner"
    },
    {
      id: 3,
      title: "Frontend Developer",
      description: "Master HTML, CSS, JavaScript, React, and modern frontend development practices.",
      category: "Web Development", 
      level: "Intermediate"
    },
    {
      id: 4,
      title: "Data Scientist",
      description: "Learn data analysis, machine learning, statistical modeling, and data visualization.",
      category: "Data Science",
      level: "Advanced"
    },
    {
      id: 5,
      title: "System Design Engineer",
      description: "Master distributed systems, scalability, microservices, and system architecture patterns.",
      category: "System Design",
      level: "Advanced"
    },
    {
      id: 6,
      title: "DevOps Engineer",
      description: "Learn CI/CD pipelines, containerization, cloud platforms, and infrastructure automation.",
      category: "DevOps",
      level: "Intermediate"
    }
  ];

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
    setSelectedInterviewer('');
    setAgreeToTerms(false);
  };

  const handleProceedWithInterview = () => {
    console.log('Proceeding with interview');
    setShowPermissionDialog(false);
    setShowInterviewScreen(true);
  };

  const handleCancelInterview = () => {
    console.log('Canceling interview');
    setShowPermissionDialog(false);
    // Stop media stream if exists
    if (interviewSettings?.mediaStream) {
      interviewSettings.mediaStream.getTracks().forEach(track => track.stop());
    }
    setInterviewSettings(null);
    setSelectedRole(null); // Reset selected role only when canceling
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
    // Reset all states when going back to library
    setShowInterviewScreen(false);
    setShowThankYouScreen(false);
    setShowReportsScreen(false);
    setInterviewSettings(null);
    setSelectedRole(null);
    
    // Stop media stream if exists
    if (interviewSettings?.mediaStream) {
      interviewSettings.mediaStream.getTracks().forEach(track => track.stop());
    }
  };

  const handleStartInterview = async () => {
    console.log('handleStartInterview called');
    if (!selectedDifficulty || !selectedDuration || !selectedInterviewer || !agreeToTerms) {
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
        interviewer: selectedInterviewer,
        mediaStream: stream
      };

      console.log('Setting interview settings and showing permission dialog');
      setInterviewSettings(settings);
      
      // Close modal but keep selectedRole
      setShowModal(false);
      setSelectedDifficulty('');
      setSelectedDuration('');
      setSelectedInterviewer('');
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

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'Beginner': return 'secondary';
      case 'Intermediate': return 'default';
      case 'Advanced': return 'destructive';
      default: return 'secondary';
    }
  };

  // Show reports screen if active
  if (showReportsScreen && selectedRole && interviewSettings) {
    return (
      <ReportsScreen
        role={selectedRole}
        difficulty={interviewSettings.difficulty}
        duration={interviewSettings.duration}
        onTryAgain={handleTryAgain}
        onBackToLibrary={handleBackToLibrary}
      />
    );
  }

  // Show thank you screen if active
  if (showThankYouScreen && selectedRole && interviewSettings) {
    return (
      <ThankYouScreen
        role={selectedRole}
        difficulty={interviewSettings.difficulty}
        duration={interviewSettings.duration}
        onViewReports={handleViewReports}
        onTryAgain={handleTryAgain}
        onBackToLibrary={handleBackToLibrary}
      />
    );
  }

  // Show interview screen if active
  if (showInterviewScreen && selectedRole && interviewSettings) {
    return (
      <InterviewScreen
        role={selectedRole}
        difficulty={interviewSettings.difficulty}
        duration={interviewSettings.duration}
        interviewer={interviewSettings.interviewer}
        mediaStream={interviewSettings.mediaStream}
        onExit={handleExitInterview}
        onInterviewComplete={handleInterviewComplete}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Interview Library</h2>
          <p className="text-muted-foreground">Practice interviews tailored for specific roles</p>
        </div>
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => (
          <Card key={role.id} className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {role.title}
                </CardTitle>
                <Badge variant={getLevelBadgeVariant(role.level)}>
                  {role.level}
                </Badge>
              </div>
              <Badge variant="outline" className="w-fit text-xs">
                {role.category}
              </Badge>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {role.description}
              </p>
              
              <Button 
                onClick={() => handleStartPracticeClick(role)}
                className="w-full"
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Practice
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interview Setup Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Interview Setup</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Role Information */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{selectedRole?.title}</h3>
              <Badge variant="secondary" className="w-fit">
                Role Related
              </Badge>
            </div>

            {/* Difficulty Level */}
            <div className="space-y-3">
              <h4 className="font-medium">Difficulty Level *</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['Fresher', 'Beginner (1-3yrs)', 'Professional (3+ years)'].map((difficulty) => (
                  <Button
                    key={difficulty}
                    variant={selectedDifficulty === difficulty ? "default" : "outline"}
                    onClick={() => setSelectedDifficulty(difficulty)}
                    className="justify-start"
                  >
                    {difficulty}
                  </Button>
                ))}
              </div>
            </div>

            {/* Interview Duration */}
            <div className="space-y-3">
              <h4 className="font-medium">Interview Duration *</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: '5 mins', label: '5 mins' },
                  { value: '15 mins', label: '15 mins', premium: true },
                  { value: '30 mins', label: '30 mins', premium: true }
                ].map((duration) => (
                  <Button
                    key={duration.value}
                    variant={selectedDuration === duration.value ? "default" : "outline"}
                    onClick={() => setSelectedDuration(duration.value)}
                    className="justify-between"
                  >
                    <span>{duration.label}</span>
                    {duration.premium && <Star className="h-4 w-4 text-yellow-500" />}
                  </Button>
                ))}
              </div>
            </div>

            {/* Select Interviewer */}
            <div className="space-y-3">
              <h4 className="font-medium">Select Your Interviewer *</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { id: 'Junnu', name: 'Junnu', accent: 'IN English' },
                  { id: 'Munnu', name: 'Munnu', accent: 'US English' }
                ].map((interviewer) => (
                  <Card 
                    key={interviewer.id}
                    className={`cursor-pointer transition-colors ${
                      selectedInterviewer === interviewer.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedInterviewer(interviewer.id)}
                  >
                    <CardContent className="flex items-center space-x-3 p-4">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        {interviewer.name[0]}
                      </div>
                      <div>
                        <p className="font-medium">{interviewer.name}</p>
                        <p className="text-sm text-muted-foreground">{interviewer.accent}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="terms" className="text-sm">
                I agree with the <span className="text-primary underline cursor-pointer">terms and conditions</span>.
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleStartInterview}
                disabled={!selectedDifficulty || !selectedDuration || !selectedInterviewer || !agreeToTerms}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Practice
              </Button>
            </div>
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
  );
};

export default MockInterviewLibrary;