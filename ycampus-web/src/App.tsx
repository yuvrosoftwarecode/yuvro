import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import DashboardRedirect from "./components/DashboardRedirect";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PracticeQuestions from "./pages/admin/PracticeQuestions";
import TestQuestions from "./pages/admin/TestQuestions";
import AdminSubjects from "./pages/admin/Subjects";
import SubjectEdit from "./components/admin/subjects/SubjectEdit";
import CollegeSubjects from "./pages/admin/CollegeSubjects";
import AdminCollege from "./pages/admin/College";
import CollegeDetails from "./pages/admin/CollegeDetails";
import AdminUsers from "./pages/admin/Users";
import AdminSkillTests from "./pages/admin/SkillTests";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import Syllabus from "./pages/faculty/Syllabus";
import Revise from "./pages/faculty/Revise";
import Attendance from "./pages/faculty/Attendance";
import TakeAttendance from "./pages/faculty/TakeAttendance";
import Task from "./pages/faculty/Task";
import FacultyInternalTest from "./pages/faculty/InternalTest";
import Reports from "./pages/faculty/Reports";
import AttendanceReport from "./pages/faculty/AttendanceReport";
import HODDashboard from "./pages/hod/HODDashboard";
import HODStudents from "./pages/hod/Students";
import HODFaculty from "./pages/hod/Faculty";
import HODAnnouncements from "./pages/hod/Announcements";
import PrincipalDashboard from "./pages/principal/PrincipalDashboard";
import PrincipalDepartments from "./pages/principal/Departments";
import PrincipalAnnouncements from './pages/principal/Announcements';
import PRIReport from "./pages/principal/PRIReport";
import DepartmentDetail from "./pages/principal/DepartmentDetail";
import PrincipalHODs from "./pages/principal/HODs";
import CollegeAdminDashboard from "./pages/college-admin/CollegeAdminDashboard";
import CollegeAdminPrincipals from "./pages/college-admin/Principals";
import CollegeAdminHODs from "./pages/college-admin/HODs";
import CollegeAdminDepartments from "./pages/college-admin/Departments";
import CollegeAdminAnnouncements from "./pages/college-admin/Announcements";
import CollegeAdminBatchIds from "./pages/college-admin/BatchIds";
import CollegeAdminFaculty from "./pages/college-admin/Faculty";
import CollegeAdminStudents from "./pages/college-admin/Students";
import CollegeAdminTPO from "@/pages/college-admin/TPOManagement";
import CollegeAdminSubjects from "./pages/college-admin/Subjects";
import CollegeAdminPracticeTest from "./pages/college-admin/PracticeTest";
import PrincipalFaculty from "./pages/principal/Faculty";
import PrincipalStudents from "./pages/principal/Students";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentUpgrade from "./pages/student/StudentUpgrade";
import StudentTask from "./pages/student/Task";
import StudentTest from "./pages/student/Test";
import StudentInternalTest from "./pages/student/InternalTest";
import StudentMockInterview from "./pages/student/MockInterview";
import StudentNotes from "./pages/student/Notes";
import StudentCommunity from "./pages/student/Community";
import StudentAnnouncements from "./pages/student/Announcements";
import AIInterviewPlanner from "./pages/student/AIInterviewPlanner";

import Contest from "./pages/student/Contest";
import ContestDetail from "./pages/student/ContestDetail";
import ContestAttempt from "./pages/student/ContestAttempt";
// MockInterviewSelect replaced by StudentMockInterview
import StudentJobs from "./pages/student/Jobs";
import CodePractice from "./pages/student/CodePractice";
import StudentProfile from "./pages/student/Profile";
import PlacementDashboard from "./pages/placement/PlacementDashboard";
import PlacementDashboardAssessment from "./pages/placement/Dashboard";
import PlacementStudentReports from "./pages/placement/StudentReports";
import JobApprovals from "./pages/placement/JobApprovals";
import LiveJobs from "./pages/placement/LiveJobs";
import StudentsTracking from "./pages/placement/StudentsTracking";
import PlacementAnalytics from "./pages/placement/Analytics";
import RecruiterInsights from "./pages/placement/RecruiterInsights";
import RecruiterCompanyDetail from "./pages/placement/RecruiterCompanyDetail";
import DriveCalendar from "./pages/placement/DriveCalendar";
import PlacementNotifications from "./pages/placement/Notifications";
import PlacementSettings from "./pages/placement/PlacementSettings";
import PlacementPRIReport from "./pages/placement/PlacementPRIReport";
import JobApplicationsPage from "./pages/placement/JobApplications";
import PlacementCompany from "./pages/placement/Company";
import PlacementSkillTests from "./pages/placement/SkillTests";
import SubjectDetail from "@/components/student/SubjectDetail";
import TestSubjectDetail from "@/components/student/TestSubjectDetail";
import StudentInternalTests from "./pages/student/StudentInternalTests";
import StudentInternalTestDetail from "./pages/student/StudentInternalTestDetail";
import DummyReportScreen from "./components/student/DummyReportScreen";
import MockInterviewReport from "./pages/student/MockInterviewReport";

import NotFound from "./pages/NotFound";

// Mock Interview Imports
import InstructorMockInterview from './pages/admin/MockInterview';
import MockInterviewAnalytics from './pages/admin/MockInterviewAnalytics';
import MockInterviewReports from './pages/admin/MockInterviewReports';
import MockInterviewReportView from './pages/admin/MockInterviewReportView';
import MockInterviewForm from './components/admin/mock-interviews/MockInterviewForm';

// AI Planner Admin Imports
import PlannerManagement from './pages/admin/planner/PlannerManagement';
import PlannerCompaniesTab from './components/admin/planner/PlannerCompaniesTab';
import PlannerTopicsTab from './components/admin/planner/PlannerTopicsTab';
import PlannerRoadmapsTab from './components/admin/planner/PlannerRoadmapsTab';
import PlannerAnalyticsTab from './components/admin/planner/PlannerAnalyticsTab';

const StudentLegacyRedirect = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Determine target context
  const defaultContext = user?.college_product_type === 'assessments' ? 'assessments' : 'campus';
  const context = localStorage.getItem('student_sidebar_active_toggle') || defaultContext;

  // Extract the path after /student/
  const subPath = location.pathname.replace(/^\/student\/?/, '');
  const cleanPath = subPath.replace(/^(campus|assessments)\//, '');



  // Special overrides for assessments-only features
  const isAssessmentsOnly = 
    subPath.startsWith('jobs') || 
    subPath.startsWith('ai-interview-planner') || 
    subPath.startsWith('mock-interview') || 
    subPath.startsWith('code-practice');

  const targetContext = isAssessmentsOnly ? 'assessments' : context;

  let targetSubPath = subPath;
  if (targetContext === 'campus') {
    if (subPath === 'assessment') {
      targetSubPath = 'internal-test';
    } else if (subPath === 'assessments') {
      targetSubPath = 'internal-tests';
    } else if (subPath.startsWith('assessments/')) {
      targetSubPath = subPath.replace('assessments/', 'internal-tests/');
    }
  }

  return <Navigate to={`/student/${targetContext}/${targetSubPath}${location.search}`} replace />;
};

const PlacementDashboardWrapper = () => {
  const { user } = useAuth();
  if (user?.college_product_type === 'assessments') {
    return <Navigate to="/placement/placement-dashboard" replace />;
  }
  return <PlacementDashboard />;
};

const PlacementDashboardAssessmentWrapper = () => {
  const { user } = useAuth();
  if (user?.college_product_type === 'assessments') {
    return <PlacementDashboardAssessment />;
  }
  return <Navigate to="/placement/dashboard" replace />;
};

const PlacementStudentReportsWrapper = () => {
  const { user } = useAuth();
  if (user?.college_product_type === 'assessments') {
    return <PlacementStudentReports />;
  }
  return <Navigate to="/placement/dashboard" replace />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
              v7_fetcherPersist: true,
              v7_normalizeFormMethod: true,
              v7_partialHydration: true,
              v7_skipActionErrorRevalidation: true,
            }}
          >
            <Routes>
              <Route path="/" element={<DashboardRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Routes>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="college" element={<AdminCollege />} />
                      <Route path="college/:collegeId/*" element={<CollegeDetails />} />
                      <Route path="subjects/:tab?" element={<AdminSubjects />} />
                      <Route path="subjects/:id/manage" element={<SubjectEdit />} />
                      <Route path="subjects/colleges/:collegeId" element={<CollegeSubjects />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="practice-questions" element={<PracticeQuestions />} />
                      <Route path="test-questions" element={<TestQuestions />} />
                      <Route path="skill-tests" element={<AdminSkillTests />} />

                      {/* Mock Interviews */}
                      <Route path="mock-interview" element={<InstructorMockInterview />} />
                      <Route path="mock-interview/add" element={<MockInterviewForm />} />
                      <Route path="mock-interview/:mockInterviewId/edit" element={<MockInterviewForm />} />
                      <Route path="mock-interview/:mockInterviewId/analytics" element={<MockInterviewAnalytics />} />
                      <Route path="mock-interview/reports" element={<MockInterviewReports />} />
                      <Route path="mock-interview/reports/:sessionId" element={<MockInterviewReportView />} />

                      {/* AI Planner Management */}
                      <Route path="planner" element={<PlannerManagement />}>
                        <Route index element={<Navigate to="companies" replace />} />
                        <Route path="companies" element={<PlannerCompaniesTab />} />
                        <Route path="topics" element={<PlannerTopicsTab />} />
                        <Route path="roadmaps" element={<PlannerRoadmapsTab />} />
                        <Route path="analytics" element={<PlannerAnalyticsTab />} />
                      </Route>
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* Faculty Routes */}
              <Route
                path="/faculty/*"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <Routes>
                      <Route path="dashboard" element={<FacultyDashboard />} />
                      <Route path="syllabus" element={<Syllabus />} />
                      <Route path="revise" element={<Revise />} />
                      <Route path="internal-test" element={<FacultyInternalTest />} />
                      <Route path="attendance" element={<Attendance />} />
                      <Route path="attendance/:assignmentId/take" element={<TakeAttendance />} />
                      <Route path="task" element={<Task />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="attendance-report" element={<AttendanceReport />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* Student Routes */}
              <Route
                path="/student/*"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <Routes>
                      {/* Legacy student paths redirect to prefixed paths */}
                      <Route index element={<StudentLegacyRedirect />} />
                      <Route path="dashboard" element={<StudentLegacyRedirect />} />
                      <Route path="task" element={<StudentLegacyRedirect />} />
                      <Route path="contest" element={<StudentLegacyRedirect />} />
                      <Route path="contest/:contestId" element={<StudentLegacyRedirect />} />
                      <Route path="contests" element={<StudentLegacyRedirect />} />
                      <Route path="contests/:contestId" element={<StudentLegacyRedirect />} />
                      <Route path="contests/:contestId/attempt" element={<StudentLegacyRedirect />} />
                      <Route path="notes" element={<StudentLegacyRedirect />} />
                      <Route path="notes/:subjectId" element={<StudentLegacyRedirect />} />
                      <Route path="test" element={<StudentLegacyRedirect />} />
                      <Route path="skill-test" element={<StudentLegacyRedirect />} />
                      <Route path="assessments" element={<StudentLegacyRedirect />} />
                      <Route path="assessments/:subjectId" element={<StudentLegacyRedirect />} />
                      <Route path="assessment" element={<StudentLegacyRedirect />} />
                      <Route path="announcements" element={<StudentLegacyRedirect />} />
                      <Route path="community" element={<StudentLegacyRedirect />} />
                      <Route path="subjects/:id" element={<StudentLegacyRedirect />} />
                      <Route path="test-subjects/:id" element={<StudentLegacyRedirect />} />
                      <Route path="test/:subjectId" element={<StudentLegacyRedirect />} />
                      <Route path="skill-test/:subjectId" element={<StudentLegacyRedirect />} />
                      <Route path="profile" element={<StudentLegacyRedirect />} />
                      
                      <Route path="jobs" element={<StudentLegacyRedirect />} />
                      <Route path="ai-interview-planner" element={<StudentLegacyRedirect />} />
                      <Route path="mock-interview" element={<StudentLegacyRedirect />} />
                      <Route path="mock-interview/report/:submissionId" element={<StudentLegacyRedirect />} />
                      <Route path="mock-interview/report/ml" element={<StudentLegacyRedirect />} />
                      <Route path="code-practice" element={<StudentLegacyRedirect />} />
                      <Route path="code-practice/subjects/:subjectId" element={<StudentLegacyRedirect />} />
                      <Route path="code-practice/subjects/:subjectId/units/:unitId" element={<StudentLegacyRedirect />} />
                      <Route path="code-practice/subjects/:subjectId/units/:unitId/questions/:problemId" element={<StudentLegacyRedirect />} />

                      {/* Campus/Academic prefix routes */}
                      <Route path="campus/dashboard" element={<StudentDashboard />} />
                      <Route path="campus/upgrade" element={<StudentUpgrade />} />
                      <Route path="campus/task" element={<StudentTask />} />
                      <Route path="campus/contest" element={<Contest />} />
                      <Route path="campus/contests" element={<Contest />} />
                      <Route path="campus/contests/:contestId" element={<ContestDetail />} />
                      <Route path="campus/contests/:contestId/attempt" element={<ContestAttempt />} />
                      <Route path="campus/notes" element={<StudentNotes />} />
                      <Route path="campus/notes/:subjectId" element={<SubjectDetail />} />
                      <Route path="campus/test" element={<StudentTest />} />
                      <Route path="campus/skill-test" element={<StudentTest />} />
                      <Route path="campus/internal-tests" element={<StudentInternalTests />} />
                      <Route path="campus/internal-tests/:subjectId" element={<StudentInternalTestDetail />} />
                      <Route path="campus/internal-test" element={<StudentInternalTest />} />
                      <Route path="campus/announcements" element={<StudentAnnouncements />} />
                      <Route path="campus/community" element={<StudentCommunity />} />
                      <Route path="campus/subjects/:id" element={<SubjectDetail />} />
                      <Route path="campus/test-subjects/:id" element={<TestSubjectDetail />} />
                      <Route path="campus/test/:subjectId" element={<TestSubjectDetail />} />
                      <Route path="campus/skill-test/:subjectId" element={<TestSubjectDetail />} />
                      <Route path="campus/profile" element={<StudentProfile />} />

                      {/* Assessments prefix routes */}
                      <Route path="assessments/dashboard" element={<StudentDashboard />} />
                      <Route path="assessments/upgrade" element={<StudentUpgrade />} />
                      <Route path="assessments/task" element={<StudentTask />} />
                      <Route path="assessments/contest" element={<Contest />} />
                      <Route path="assessments/contests" element={<Contest />} />
                      <Route path="assessments/contests/:contestId" element={<ContestDetail />} />
                      <Route path="assessments/contests/:contestId/attempt" element={<ContestAttempt />} />
                      <Route path="assessments/notes" element={<StudentNotes />} />
                      <Route path="assessments/notes/:subjectId" element={<SubjectDetail />} />
                      <Route path="assessments/test" element={<StudentTest />} />
                      <Route path="assessments/skill-test" element={<StudentTest />} />
                      <Route path="assessments/assessments" element={<StudentInternalTests />} />
                      <Route path="assessments/assessments/:subjectId" element={<StudentInternalTestDetail />} />
                      <Route path="assessments/assessment" element={<StudentInternalTest />} />
                      <Route path="assessments/announcements" element={<StudentAnnouncements />} />
                      <Route path="assessments/community" element={<StudentCommunity />} />
                      <Route path="assessments/subjects/:id" element={<SubjectDetail />} />
                      <Route path="assessments/test-subjects/:id" element={<TestSubjectDetail />} />
                      <Route path="assessments/test/:subjectId" element={<TestSubjectDetail />} />
                      <Route path="assessments/skill-test/:subjectId" element={<TestSubjectDetail />} />
                      <Route path="assessments/profile" element={<StudentProfile />} />
                      <Route path="assessments/ai-interview-planner" element={<AIInterviewPlanner />} />
                      <Route path="assessments/jobs" element={<StudentJobs />} />
                      <Route path="assessments/mock-interview" element={<StudentMockInterview />} />
                      <Route path="assessments/mock-interview/report/:submissionId" element={<MockInterviewReport />} />
                      <Route path="assessments/mock-interview/report/ml" element={<DummyReportScreen />} />
                      <Route path="assessments/code-practice" element={<CodePractice />} />
                      <Route path="assessments/code-practice/subjects/:subjectId" element={<CodePractice />} />
                      <Route path="assessments/code-practice/subjects/:subjectId/units/:unitId" element={<CodePractice />} />
                      <Route path="assessments/code-practice/subjects/:subjectId/units/:unitId/questions/:problemId" element={<CodePractice />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* HOD Routes */}
              <Route
                path="/hod/*"
                element={
                  <ProtectedRoute allowedRoles={["hod"]}>
                    <Routes>
                      <Route path="dashboard" element={<HODDashboard />} />
                      <Route path="students" element={<HODStudents />} />
                      <Route path="faculty" element={<HODFaculty />} />
                      <Route path="announcements" element={<HODAnnouncements />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* Principal Routes */}
              <Route
                path="/principal/*"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <Routes>
                      <Route path="dashboard" element={<PrincipalDashboard />} />
                      <Route path="departments" element={<PrincipalDepartments />} />
                      <Route path="departments/:id" element={<DepartmentDetail />} />
                      <Route path="faculty" element={<PrincipalFaculty />} />
                      <Route path="students" element={<PrincipalStudents />} />
                      <Route path="announcements" element={<PrincipalAnnouncements />} />
                      <Route path="pri-report" element={<PRIReport />} />
                      <Route path="hods" element={<PrincipalHODs />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* College Admin Routes */}
              <Route
                path="/college-admin/*"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <Routes>
                      <Route path="dashboard" element={<CollegeAdminDashboard />} />
                      <Route path="principals" element={<CollegeAdminPrincipals />} />
                      <Route path="hods" element={<CollegeAdminHODs />} />
                      <Route path="departments" element={<CollegeAdminDepartments />} />
                      <Route path="departments/:id" element={<CollegeAdminDepartments />} />
                      <Route path="batch-ids" element={<CollegeAdminBatchIds />} />
                      <Route path="faculty" element={<CollegeAdminFaculty />} />
                      <Route path="students" element={<CollegeAdminStudents />} />
                      <Route path="tpo" element={<CollegeAdminTPO />} />
                      <Route path="subjects" element={<CollegeAdminSubjects />} />
                      <Route path="practice-test" element={<CollegeAdminPracticeTest />} />
                      <Route path="announcements" element={<CollegeAdminAnnouncements />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* Placement Routes */}
              <Route
                path="/placement/*"
                element={
                  <ProtectedRoute allowedRoles={["placement_officer"]}>
                    <Routes>
                      <Route path="dashboard" element={<PlacementDashboardWrapper />} />
                      <Route path="placement-dashboard" element={<PlacementDashboardAssessmentWrapper />} />
                      <Route path="student-reports" element={<PlacementStudentReportsWrapper />} />
                      <Route path="job-approvals" element={<JobApprovals />} />
                      <Route path="live-jobs" element={<LiveJobs />} />
                      <Route path="students" element={<StudentsTracking />} />
                      <Route path="analytics" element={<PlacementAnalytics />} />
                      <Route path="recruiter-insights" element={<RecruiterInsights />} />
                      <Route path="recruiter-company/:id" element={<RecruiterCompanyDetail />} />
                      <Route path="recruiters" element={<RecruiterInsights />} />
                      <Route path="recruiters/:id" element={<RecruiterCompanyDetail />} />
                      <Route path="drives" element={<DriveCalendar />} />
                      <Route path="notifications" element={<PlacementNotifications />} />
                      <Route path="settings" element={<PlacementSettings />} />
                      <Route path="pri-report" element={<PlacementPRIReport />} />
                      <Route path="job-applications/:jobId" element={<JobApplicationsPage />} />
                      <Route path="job-applications" element={<JobApplicationsPage />} />
                      <Route path="company" element={<PlacementCompany />} />
                      <Route path="skill-tests" element={<PlacementSkillTests />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
            <ToastNotificationManager />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

const ToastNotificationManager = () => {
  const { toast } = useToast();
  useEffect(() => {
    const error = sessionStorage.getItem('toast_error');
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
      sessionStorage.removeItem('toast_error');
    }
  }, [toast]);
  return null;
};

export default App;