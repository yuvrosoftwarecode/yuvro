import { BrowserRouter as Router, Routes, Route, Navigate, } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './observability/telemetry';
import Home from './pages/landing/Home';
import Login from './pages/common/Login';
import Register from './pages/common/Register';
import ComingSoon from './pages/common/ComingSoon';
import Profile from './pages/student/Profile';
import Learn from './pages/student/Learn';
import NotFound from './pages/common/NotFound';
import ResetPassword from './pages/common/ResetPassword';
import ForgotPassword from './pages/common/ForgotPassword';
import InstructorDashboard from './pages/admin/Dashboard';
import Subjects from './pages/admin/Subjects';
import SubjectEdit from './components/admin/subjects/SubjectEdit';

import Users from './pages/admin/Users';
import Colleges from './pages/admin/Colleges';
import CollegeDetails from './components/admin/colleges/CollegeDetails';
import StudentDashboard from './pages/student/StudentDashboard';
import SubjectDetail from './components/student/SubjectDetail';
import SkillTest from './pages/student/PracticeTest';
import MockInterview from './pages/student/MockInterview';
import StudentJobs from './pages/student/Jobs';
import JobDetails from './pages/student/JobDetails';
import Contest from './pages/student/Contest';
import ContestAttempt from './pages/student/ContestAttempt';
import CodePractice from './pages/student/CodePractice';
import StudentQuiz from './components/student/StudentQuiz';
import StudentCoding from './components/student/StudentCoding';
import Certify from './pages/student/Certify';
import CertificationExam from './pages/student/CertificationExam';
import StudentInterviewPrep from './pages/student/StudentInterviewPrep';
import AIInterviewPlanner from './pages/student/AIInterviewPlanner';
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from './components/ErrorBoundary';
import DashboardRedirect from './components/DashboardRedirect';
import OwnerContest from './pages/admin/Contest';
import ContestEdit from './components/admin/contests/ContestEdit';
import ContestForm from './components/admin/contests/ContestForm';
import StudentAssessments from './pages/student/StudentAssessments';
import InstructorSkillTest from './pages/admin/TestManager';
import SkillTestForm from './components/admin/skill-tests/TestForm';
import InstructorProfile from './pages/admin/Profile';
import InstructorMockInterview from './pages/admin/MockInterview';
import MockInterviewForm from './components/admin/mock-interviews/MockInterviewForm';
import SkillTestSubmissions from './pages/admin/TestSubmissions';
import SubmissionAnalytics from './pages/admin/SubmissionAnalytics';
import InstructorCertifications from './pages/admin/Certifications';
import CertificationExamForm from './components/admin/certifications/CertificationExamForm';
import CertificationExamSubmissions from './pages/admin/CertificationExamSubmissions';
import CertificationSubmissionAnalytics from './pages/admin/CertificationSubmissionAnalytics';
import InstructorAnalytics from './pages/admin/Analytics';
import RecruiterJobs from "./pages/recruiter/Jobs";
import RecruiterJobsApproval from "./pages/recruiter/JobsApproval";
import RecruiterJobApplicants from "./pages/recruiter/JobApplicants";
import RecruiterCompanies from "./pages/recruiter/Companies";
import RecruiterCompanyDetail from "./pages/recruiter/CompanyDetail";
import RecruiterDashboard from "./pages/recruiter/Dashboard";
import RecruiterProfile from "./pages/recruiter/Profile";
import RecruiterCandidates from "./pages/recruiter/Candidates";
import AddJob from "./components/student/AddJob";
import ApplicationTracker from "@/components/student/jobs/ApplicationTracker";
import CodeEditorTool from './pages/common/CodeEditorTool';
import Departments from './pages/admin/Departments';
import CollegeSubjects from './pages/admin/CollegeSubjects';
import MockInterviewAnalytics from './pages/admin/MockInterviewAnalytics';
import MockInterviewReports from './pages/admin/MockInterviewReports';
import MockInterviewReportView from './pages/admin/MockInterviewReportView';


import CollegeAdminDashboard from './pages/college-admin/Dashboard';
import PrincipalDashboard from './pages/principal/PrincipalDashboard';
import HODDashboard from './pages/hod/HODDashboard';
import HODs from './pages/principal/HODs';

import PrincipalDepartments from './pages/principal/Departments';
import DepartmentDetail from './pages/principal/DepartmentDetail';
import Faculty from './pages/principal/Faculty';
import Students from './pages/principal/Students';
import PRIReport from './pages/principal/PRIReport';



import FacultyDashboard from './pages/faculty/Dashboard';
import Attendance from './pages/faculty/Attendance';
import TakeAttendance from './pages/faculty/TakeAttendance';
import FacultyTask from './pages/faculty/Task';
import Revise from './pages/faculty/Revise';
import Syllabus from './pages/faculty/Syllabus';
import FacultyReports from './pages/faculty/Reports';
import AttendanceReport from './pages/faculty/AttendanceReport';
import StudentTask from './pages/student/Task';
import DepartmentsScreen from './pages/college-admin/DepartmentsScreen';
import BatchesScreen from './pages/college-admin/BatchesScreen';
import FacultyScreen from './pages/college-admin/FacultyScreen';
import StudentsScreen from './pages/college-admin/StudentsScreen';
import TPOScreen from './pages/college-admin/TPOScreen';
import TPODashboard from './pages/tpo/Dashboard';
import TPOJobApprovals from './pages/tpo/JobApprovals';
import TPOLiveJobs from './pages/tpo/LiveJobs';
import TPOStudentsTracking from './pages/tpo/StudentsTracking';
import TPOAIAnalytics from './pages/tpo/AIAnalytics';
import TPORecruiterInsights from './pages/tpo/RecruiterInsights';
import TPOOfferTracking from './pages/tpo/OfferTracking';
import TPODriveCalendar from './pages/tpo/DriveCalendar';
import TPONotifications from './pages/tpo/Notifications';
import TPOSettings from './pages/tpo/Settings';


import StudentAnnouncementsScreen from './pages/student/StudentAnnouncementsScreen';
import AnnouncementsScreen from './pages/college-admin/AnnouncementsScreen';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route
                path="/student/announcements"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentAnnouncementsScreen />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:uidb64/:token" element={<ResetPassword />} />
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/jobs/:jobId" element={<JobDetails />} />
              <Route path="/recruiter/jobs" element={<RecruiterJobs />} />
              <Route path="/add-job" element={<AddJob />} />
              <Route path="/student/applications" element={<ApplicationTracker appliedJobs={[]} />} />


              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/learn/:subjectId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <SubjectDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/learn/:subUnitId/quiz"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentQuiz />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/learn/:subUnitId/coding"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentCoding />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/learn"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <Learn />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/practice-tests"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <SkillTest testType="practice" />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/practice-tests/:subjectId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <SkillTest testType="practice" />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/practice-tests/:subjectId/:testId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <SkillTest testType="practice" />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/practice-tests/:subjectId/:testId/results"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <SkillTest testType="practice" />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/assessments"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentAssessments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/assessments/:subjectId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentAssessments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/assessments/:subjectId/:testId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentAssessments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/assessments/:subjectId/:testId/results"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentAssessments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/interview-prep"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentInterviewPrep />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/mock-interview"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <MockInterview />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/jobs"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/jobs/:jobId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <JobDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/contests"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/contests/:contestId/attempt"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ContestAttempt />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/code-practice"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <CodePractice />
                  </ProtectedRoute>
                }
              />

              {/* Newly added Coming Soon Pages for Student Dashboard Links */}
              <Route
                path="/student/notes"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/practice-test"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/task"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/assessment"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/ai-interview-planner"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/announcements"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/community"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/student/ai-interview-planner"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <AIInterviewPlanner />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/code-practice/subjects/:subjectId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <CodePractice />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/code-practice/subjects/:subjectId/units/:unitId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <CodePractice />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/code-practice/subjects/:subjectId/units/:unitId/questions/:problemId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <CodePractice />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <InstructorDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/recruiter/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["recruiter"]}>
                    <RecruiterDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/college-admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <CollegeAdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/principal/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <PrincipalDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/principal/departments"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <PrincipalDepartments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/departments/:id"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <DepartmentDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/faculty"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <Faculty />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/students"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <Students />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/hods"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <HODs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/pri-report"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <PRIReport />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hod/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["hod"]}>
                    <HODDashboard />
                  </ProtectedRoute>
                }
              />



              <Route
                path="/faculty/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <FacultyDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tpo/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["tpo"]}>
                    <TPODashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tpo/job-approvals"
                element={
                  <ProtectedRoute allowedRoles={["tpo"]}>
                    <TPOJobApprovals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tpo/live-jobs"
                element={
                  <ProtectedRoute allowedRoles={["tpo"]}>
                    <TPOLiveJobs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tpo/students"
                element={
                  <ProtectedRoute allowedRoles={["tpo"]}>
                    <TPOStudentsTracking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tpo/offer-tracking"
                element={
                  <ProtectedRoute allowedRoles={["tpo"]}>
                    <TPOOfferTracking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tpo/analytics"
                element={
                  <ProtectedRoute allowedRoles={["tpo"]}>
                    <TPOAIAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tpo/recruiter-insights"
                element={
                  <ProtectedRoute allowedRoles={["tpo"]}>
                    <TPORecruiterInsights />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tpo/calendar"
                element={
                  <ProtectedRoute allowedRoles={["tpo"]}>
                    <TPODriveCalendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tpo/notifications"
                element={
                  <ProtectedRoute allowedRoles={["tpo"]}>
                    <TPONotifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tpo/settings"
                element={
                  <ProtectedRoute allowedRoles={["tpo"]}>
                    <TPOSettings />
                  </ProtectedRoute>
                }
              />
              
              {/* Placement Routes */}
              <Route
                path="/placement/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["placement", "tpo", "placement_officer"]}>
                    <TPODashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/placement/pri-report"
                element={
                  <ProtectedRoute allowedRoles={["placement", "tpo", "placement_officer"]}>
                    <PRIReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/placement/job-approvals"
                element={
                  <ProtectedRoute allowedRoles={["placement", "tpo", "placement_officer"]}>
                    <TPOJobApprovals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/placement/offer-tracking"
                element={
                  <ProtectedRoute allowedRoles={["placement", "tpo", "placement_officer"]}>
                    <TPOOfferTracking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/placement/analytics"
                element={
                  <ProtectedRoute allowedRoles={["placement", "tpo", "placement_officer"]}>
                    <TPOAIAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/placement/recruiters"
                element={
                  <ProtectedRoute allowedRoles={["placement", "tpo", "placement_officer"]}>
                    <TPORecruiterInsights />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/placement/drives"
                element={
                  <ProtectedRoute allowedRoles={["placement", "tpo", "placement_officer"]}>
                    <TPODriveCalendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/placement/notifications"
                element={
                  <ProtectedRoute allowedRoles={["placement", "tpo", "placement_officer"]}>
                    <TPONotifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/placement/settings"
                element={
                  <ProtectedRoute allowedRoles={["placement", "tpo", "placement_officer"]}>
                    <TPOSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/syllabus"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <Syllabus />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/revise"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <Revise />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/assessment"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <InstructorSkillTest basePath="/faculty/assessment" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/assessment/subjects/:subjectId/manage"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <InstructorSkillTest basePath="/faculty/assessment" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/assessment/add"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <SkillTestForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/assessment/:skillTestId/edit"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <SkillTestForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/assessment/:skillTestId/analytics"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <SkillTestSubmissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/attendance"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <Attendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/attendance/:assignmentId/take"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <TakeAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/task"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <FacultyTask />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/reports"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <FacultyReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/attendance-report"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <AttendanceReport />
                  </ProtectedRoute>
                }
              />

              {/* College Admin Routes */}
              <Route
                path="/college-admin/departments"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <DepartmentsScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/college-admin/departments/:id"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <DepartmentsScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/college-admin/batches"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <BatchesScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/college-admin/faculty"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <FacultyScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/college-admin/students"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <StudentsScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/college-admin/tpo"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <TPOScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/college-admin/announcements"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <AnnouncementsScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/college-admin/tpo"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <TPOScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/college-admin/reports"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/college-admin/activity-logs"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <AnnouncementsScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/college-admin/settings"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/subjects/colleges/:collegeId"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/hods"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/faculty"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/students"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/courses"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/reports"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/settings"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />



              <Route
                path="/recruiter/jobs"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <RecruiterJobs />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/recruiter/jobs-approval"
                element={
                  <ProtectedRoute allowedEmails={["recruiter@yuvro.com", "recruiter_admin@yuvro.com", "admin@yuvro.com"]}>
                    <RecruiterJobsApproval />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/recruiter/jobs/:jobId/applicants"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <RecruiterJobApplicants />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/recruiter/candidates"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <RecruiterCandidates />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/recruiter/jobs/companies"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <RecruiterCompanies />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/recruiter/jobs/companies/:companyId"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <RecruiterCompanyDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/recruiter/profile"
                element={
                  <ProtectedRoute allowedRoles={["recruiter"]}>
                    <RecruiterProfile />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/admin/subjects"
                element={<Navigate to="/admin/subjects/global" replace />}
              />
              <Route
                path="/admin/subjects/:tab"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <Subjects />
                  </ProtectedRoute>
                }
              />



              <Route
                path="/admin/subjects/:id/manage"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <SubjectEdit />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <Users />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/colleges"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Colleges />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/admin/colleges/:collegeId"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CollegeDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/colleges/:collegeId/management"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CollegeDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/colleges/:collegeId/academic"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CollegeDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/departments"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Departments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/batches"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Colleges />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/admin/students"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <div>Students Management</div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <div>Settings</div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/profile"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <InstructorProfile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/certifications"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <Certify />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/certifications/exam/:examId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <CertificationExam />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/task"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentTask />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/contests"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <OwnerContest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/contests/add"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <ContestForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/contests/:contestId/edit"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <ContestForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/contests/:contestId/manage"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <ContestEdit />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/skill-tests"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <InstructorSkillTest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/skill-tests/subjects/:subjectId/manage"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <InstructorSkillTest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/skill-tests/add"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <SkillTestForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/skill-tests/:skillTestId/edit"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <SkillTestForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/skill-tests/:skillTestId/analytics"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <SkillTestSubmissions />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/skill-tests/submissions/:submissionId"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <SubmissionAnalytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/mock-interview"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <InstructorMockInterview />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/certifications"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <InstructorCertifications />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/certifications/create"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <CertificationExamForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/certifications/:examId/edit"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <CertificationExamForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <InstructorAnalytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/certifications/:examId/analytics"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <CertificationExamSubmissions />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/certifications/submissions/:submissionId"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <CertificationSubmissionAnalytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/mock-interview/add"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <MockInterviewForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/mock-interview/:mockInterviewId/edit"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <MockInterviewForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/mock-interview/:mockInterviewId/analytics"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <MockInterviewAnalytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/mock-interview/reports"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <MockInterviewReports />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/mock-interview/reports/:sessionId"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <MockInterviewReportView />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/tools/code-editor"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <CodeEditorTool />
                  </ProtectedRoute>
                }
              />

              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
            <Toaster position="top-right" />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
