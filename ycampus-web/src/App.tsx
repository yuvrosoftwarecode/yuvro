import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import DashboardRedirect from "./components/DashboardRedirect";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Courses from "./pages/admin/Courses";
import Batches from "./pages/admin/Batches";
import Students from "./pages/admin/Students";
import Faculty from "./pages/admin/Faculty";
import PracticeQuestions from "./pages/admin/PracticeQuestions";
import TestQuestions from "./pages/admin/TestQuestions";
import AdminSubjects from "./pages/admin/Subjects";
import SubjectEdit from "./components/admin/subjects/SubjectEdit";
import CollegeSubjects from "./pages/admin/CollegeSubjects";
import AdminCollege from "./pages/admin/College";
import CollegeDetails from "./pages/admin/CollegeDetails";
import AdminDepartments from "./pages/admin/Departments";
import AdminSemesters from "./pages/admin/Semesters";
import AdminUsers from "./pages/admin/Users";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import Syllabus from "./pages/faculty/Syllabus";
import Revise from "./pages/faculty/Revise";
import Attendance from "./pages/faculty/Attendance";
import TakeAttendance from "./pages/faculty/TakeAttendance";
import Task from "./pages/faculty/Task";
import Assessment from "./pages/faculty/Assessment";
import Reports from "./pages/faculty/Reports";
import AttendanceReport from "./pages/faculty/AttendanceReport";
import HODDashboard from "./pages/hod/HODDashboard";
import HODStudents from "./pages/hod/Students";
import HODFaculty from "./pages/hod/Faculty";
import PrincipalDashboard from "./pages/principal/PrincipalDashboard";
import PrincipalDepartments from "./pages/principal/Departments";
import PRIReport from "./pages/principal/PRIReport";
import DepartmentDetail from "./pages/principal/DepartmentDetail";
import PrincipalHODs from "./pages/principal/HODs";
import CollegeAdminDashboard from "./pages/college-admin/CollegeAdminDashboard";
import CollegeAdminPrincipals from "./pages/college-admin/Principals";
import CollegeAdminHODs from "./pages/college-admin/HODs";
import CollegeAdminDepartments from "./pages/college-admin/Departments";
import CollegeAdminBatchIds from "./pages/college-admin/BatchIds";
import CollegeAdminFaculty from "./pages/college-admin/Faculty";
import CollegeAdminStudents from "./pages/college-admin/Students";
import CollegeAdminTPO from "@/pages/college-admin/TPOManagement";
import CollegeAdminSubjects from "./pages/college-admin/Subjects";
import PrincipalFaculty from "./pages/principal/Faculty";
import PrincipalStudents from "./pages/principal/Students";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentTask from "./pages/student/Task";
import StudentTest from "./pages/student/Test";
import StudentAssessment from "./pages/student/Assessment";
import StudentMockInterview from "./pages/student/MockInterview";
import StudentNotes from "./pages/student/Notes";
import StudentCommunity from "./pages/student/Community";
import StudentAnnouncements from "./pages/student/Announcements";
import AIInterviewPlanner from "./pages/student/AIInterviewPlanner";
import InterviewPreparation from "./pages/student/InterviewPreparation";
import Contest from "./pages/student/Contest";
// MockInterviewSelect replaced by StudentMockInterview
import StudentJobs from "./pages/student/Jobs";
import CodePractice from "./pages/student/CodePractice";
import PlacementDashboard from "./pages/placement/PlacementDashboard";
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
import SubjectDetail from "@/components/student/SubjectDetail";
import TestSubjectDetail from "@/components/student/TestSubjectDetail";
import DummyReportScreen from "./components/student/DummyReportScreen";

import NotFound from "./pages/NotFound";

// Mock Interview Imports
import InstructorMockInterview from './pages/admin/MockInterview';
import MockInterviewAnalytics from './pages/admin/MockInterviewAnalytics';
import MockInterviewReports from './pages/admin/MockInterviewReports';
import MockInterviewReportView from './pages/admin/MockInterviewReportView';
import MockInterviewForm from './components/admin/mock-interviews/MockInterviewForm';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                      <Route path="departments" element={<AdminDepartments />} />
                      <Route path="batches" element={<Batches />} />
                      <Route path="semesters" element={<AdminSemesters />} />
                      <Route path="subjects/:tab?" element={<AdminSubjects />} />
                      <Route path="subjects/:id/manage" element={<SubjectEdit />} />
                      <Route path="subjects/colleges/:collegeId" element={<CollegeSubjects />} />
                      <Route path="courses" element={<Courses />} />
                      <Route path="students" element={<Students />} />
                      <Route path="faculty" element={<Faculty />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="practice-questions" element={<PracticeQuestions />} />
                      <Route path="test-questions" element={<TestQuestions />} />

                      {/* Mock Interviews */}
                      <Route path="mock-interview" element={<InstructorMockInterview />} />
                      <Route path="mock-interview/add" element={<MockInterviewForm />} />
                      <Route path="mock-interview/:mockInterviewId/edit" element={<MockInterviewForm />} />
                      <Route path="mock-interview/:mockInterviewId/analytics" element={<MockInterviewAnalytics />} />
                      <Route path="mock-interview/reports" element={<MockInterviewReports />} />
                      <Route path="mock-interview/reports/:sessionId" element={<MockInterviewReportView />} />
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
                      <Route path="assessment" element={<Assessment />} />
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
                      <Route path="dashboard" element={<StudentDashboard />} />
                      <Route path="task" element={<StudentTask />} />
                      <Route path="contest" element={<Contest />} />
                      <Route path="contests" element={<Contest />} />
                      <Route path="notes" element={<StudentNotes />} />
                      <Route path="notes/:subjectId" element={<SubjectDetail />} />
                      <Route path="test" element={<StudentTest />} />
                      <Route path="assessment" element={<StudentAssessment />} />
                      <Route path="jobs" element={<StudentJobs />} />
                      <Route path="announcements" element={<StudentAnnouncements />} />
                      <Route path="community" element={<StudentCommunity />} />
                      <Route path="ai-interview-planner" element={<AIInterviewPlanner />} />
                      <Route path="interview-preparation" element={<InterviewPreparation />} />
                      <Route path="mock-interview" element={<StudentMockInterview />} />
                      <Route path="mock-interview/report/ml" element={<DummyReportScreen />} />
                      <Route path="code-practice" element={<CodePractice />} />
                      <Route path="code-practice/subjects/:subjectId" element={<CodePractice />} />
                      <Route path="code-practice/subjects/:subjectId/units/:unitId" element={<CodePractice />} />
                      <Route path="code-practice/subjects/:subjectId/units/:unitId/questions/:problemId" element={<CodePractice />} />
                      <Route path="subjects/:id" element={<SubjectDetail />} />
                      <Route path="test-subjects/:id" element={<TestSubjectDetail />} />
                      <Route path="test/:subjectId" element={<TestSubjectDetail />} />
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
                      <Route path="dashboard" element={<PlacementDashboard />} />
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
                    </Routes>
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
