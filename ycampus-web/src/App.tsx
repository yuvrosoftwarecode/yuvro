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
import InstructorDashboard from './pages/instructor/Dashboard';
import Subjects from './pages/instructor/Subjects';
import SubjectEdit from './components/instructor/subjects/SubjectEdit';

import Users from './pages/instructor/Users';
import Colleges from './pages/instructor/Colleges';
import CollegeDetails from './components/instructor/colleges/CollegeDetails';
import StudentDashboard from './pages/student/StudentDashboard';
import SubjectDetail from './components/student/SubjectDetail';
import SkillTest from './pages/student/SkillTest';
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
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from './components/ErrorBoundary';
import DashboardRedirect from './components/DashboardRedirect';
import OwnerContest from './pages/instructor/Contest';
import ContestEdit from './components/instructor/contests/ContestEdit';
import ContestForm from './components/instructor/contests/ContestForm';
import InstructorSkillTest from './pages/instructor/SkillTest';
import SkillTestForm from './components/instructor/skill-tests/SkillTestForm';
import InstructorProfile from './pages/instructor/Profile';
import InstructorMockInterview from './pages/instructor/MockInterview';
import MockInterviewForm from './components/instructor/mock-interviews/MockInterviewForm';
import SkillTestSubmissions from './pages/instructor/SkillTestSubmissions';
import SubmissionAnalytics from './pages/instructor/SubmissionAnalytics';
import InstructorCertifications from './pages/instructor/Certifications';
import CertificationExamForm from './components/instructor/certifications/CertificationExamForm';
import CertificationExamSubmissions from './pages/instructor/CertificationExamSubmissions';
import CertificationSubmissionAnalytics from './pages/instructor/CertificationSubmissionAnalytics';
import InstructorAnalytics from './pages/instructor/Analytics';
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
import Departments from './pages/instructor/Departments';
import CollegeSubjects from './pages/instructor/CollegeSubjects';

import CollegeAdminDashboard from './pages/college-admin/Dashboard';
import PrincipalDashboard from './pages/principal/Dashboard';
import HODDashboard from './pages/hod/Dashboard';

import FacultyDashboard from './pages/faculty/Dashboard';
import Attendance from './pages/faculty/Attendance';
import TakeAttendance from './pages/faculty/TakeAttendance';
import DepartmentsScreen from './pages/college-admin/DepartmentsScreen';
import BatchesScreen from './pages/college-admin/BatchesScreen';
import FacultyScreen from './pages/college-admin/FacultyScreen';
import StudentsScreen from './pages/college-admin/StudentsScreen';
import FacultyReports from './pages/faculty/Reports';
import AttendanceReport from './pages/faculty/AttendanceReport';


function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
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
                path="/student/skill-test"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <SkillTest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/subjects/:subjectId/skill-tests"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <SkillTest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/subjects/:subjectId/skill-tests/:testId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <SkillTest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/subjects/:subjectId/skill-tests/:testId/results"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <SkillTest />
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
                    <StudentJobs />
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
                    <Contest />
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
                path="/instructor/dashboard"
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
                path="/faculty/syllabus"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/revise"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/assessment"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <ComingSoon />
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
                    <ComingSoon />
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
                path="/college-admin/subjects"
                element={
                  <ProtectedRoute allowedRoles={["college_admin"]}>
                    <ComingSoon />
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
                    <ComingSoon />
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

              {/* College Subject Management Route */}
              <Route
                path="/instructor/subjects/colleges/:collegeId"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <CollegeSubjects />
                  </ProtectedRoute>
                }
              />


              {/* Principal Routes */}
              <Route
                path="/principal/departments"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
                    <ComingSoon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/hods"
                element={
                  <ProtectedRoute allowedRoles={["principal"]}>
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
                path="/instructor/subjects"
                element={<Navigate to="/instructor/subjects/global" replace />}
              />
              <Route
                path="/instructor/subjects/:tab"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <Subjects />
                  </ProtectedRoute>
                }
              />



              <Route
                path="/instructor/subjects/:id/manage"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <SubjectEdit />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/instructor/users"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <Users />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/colleges"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Colleges />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/instructor/colleges/:collegeId"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CollegeDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/colleges/:collegeId/management"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CollegeDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/colleges/:collegeId/academic"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CollegeDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/departments"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Departments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/batches"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Colleges />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/instructor/students"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <div>Students Management</div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/settings"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <div>Settings</div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/profile"
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
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/contests"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <OwnerContest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/contests/add"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <ContestForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/contests/:contestId/edit"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <ContestForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/contests/:contestId/manage"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <ContestEdit />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/skill-tests"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <InstructorSkillTest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/skill-tests/subjects/:subjectId/manage"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <InstructorSkillTest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/skill-tests/add"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <SkillTestForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/skill-tests/:skillTestId/edit"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <SkillTestForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/skill-tests/:skillTestId/analytics"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <SkillTestSubmissions />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/skill-tests/submissions/:submissionId"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <SubmissionAnalytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/mock-interview"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <InstructorMockInterview />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/certifications"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <InstructorCertifications />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/certifications/create"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <CertificationExamForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/certifications/:examId/edit"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <CertificationExamForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/analytics"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <InstructorAnalytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/certifications/:examId/analytics"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <CertificationExamSubmissions />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/certifications/submissions/:submissionId"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                    <CertificationSubmissionAnalytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/mock-interview/add"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <MockInterviewForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instructor/mock-interview/:mockInterviewId/edit"
                element={
                  <ProtectedRoute allowedRoles={["admin", "instructor", "recruiter"]}>
                    <MockInterviewForm />
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
