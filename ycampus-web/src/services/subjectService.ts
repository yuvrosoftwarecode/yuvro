import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface SubUnit {
  id: string;
  unit: string;
  name: string;
  content: string | null;
  order_index: number;
  created_at: string;
}

export interface UnitBasic {
  id: string;
  subject: string;
  name: string;
  order_index: number;
  created_at: string;
  total_problems?: number;
  solved_problems?: number;
  progress_percentage?: number;
}

export interface UnitWithSubUnits extends UnitBasic {
  sub_units: SubUnit[];
}

export interface Module {
  id: number;
  title: string;
  duration: number;
  content?: string;
}

export interface Subject {
  id: string | number;
  yuvro_id?: string;
  short_code?: string;
  subject_code?: string;
  subject_name: string;
  name?: string; // Deprecated, use subject_name
  title?: string; // Deprecated, use subject_name
  level?: string;
  duration?: number;
  description?: string;
  price?: number;
  product_type?: 'campus' | 'assessments';
  modules?: Module[];
  enrolled_count?: number;
  college_count?: number;
  created_at: string;
  updated_at: string;
  units: UnitBasic[];
  total_problems?: number;
  solved_problems?: number;
  progress_percentage?: number;
  total_score?: number;
  ai_help_used?: number;
  category?: string;
}

export interface CollegeSubject {
  id: string;
  college: string;
  college_name?: string;
  subject: string;
  subject_code?: string;
  subject_details?: Subject;
  created_at: string;
}

export async function assignSubjectToCollege(payload: { college: string; subject: string; subject_code?: string }) {
  return restApiAuthUtil.post(`/course/college-subjects/`, payload);
}

export interface CollegeBasic {
  id: string;
  name: string;
  location?: string;
  created_at?: string;
}

export interface CodingProblem {
  id: string;
  title: string;
  description: string;
  input: string;
  test_cases: any[];
}

export async function markVideoAsRead(videoId: string) {
  return restApiAuthUtil.post(`/course/videos/${videoId}/mark-read/`);
}

export async function fetchSubjects(params?: { category?: string; semester?: string | number }): Promise<Subject[]> {
  const queryParams: Record<string, string> = {};
  if (params?.category) queryParams.category = params.category;
  if (params?.semester) queryParams.semester = params.semester.toString();
  return restApiAuthUtil.get('/course/subjects/', { params: queryParams });
}


export interface SectionSubjectFaculty {
  id: string;
  semester_subject: string | number;
  semester_subject_details?: {
    id: string | number;
    subject_details: Subject;
    is_elective: boolean;
    is_lab: boolean;
    semester_number: number;
    batch_id: string | number;
    batch_name: string;
    department_id: string | number;
    department_name: string;
    department_short_form: string;
  };
  section: string | number;
  section_name?: string;
  faculty: string | number;
  faculty_details?: any;
  student_count?: number;
  created_at: string;
}

export interface SemesterSubject {
  id: string;
  semester: string | number;
  subject: string | number;
  subject_details: Subject;
  is_elective: boolean;
  is_lab: boolean;
  section_faculties?: SectionSubjectFaculty[];
  created_at: string;
  assignment_id?: string | number;
}

export async function addSubjectToSemester(semesterId: string | number, subjectId: string | number) {
  return restApiAuthUtil.post(`/course/semester-subjects/`, { semester: semesterId, subject: subjectId });
}

export async function removeSubjectFromSemester(assignmentId: string | number) {
  return restApiAuthUtil.delete(`/course/semester-subjects/${assignmentId}/`);
}

export async function getSubjectsForSemester(semesterId: string | number): Promise<SemesterSubject[]> {
  const response = await restApiAuthUtil.get<SemesterSubject[]>('/course/semester-subjects/', { params: { semester: String(semesterId) } });
  return response.map(ss => ({
    ...ss,
    assignment_id: ss.id,
  } as any));
}

export async function assignFacultyToSectionSubject(payload: {
  semester_subject: string | number;
  section: string | number;
  faculty: string | number;
}) {
  return restApiAuthUtil.post(`/course/section-subject-faculty/`, payload);
}

export async function removeFacultyFromSectionSubject(id: string | number) {
  return restApiAuthUtil.delete(`/course/section-subject-faculty/${id}/`);
}

export async function getFacultyAssignments(facultyId?: string | number): Promise<SectionSubjectFaculty[]> {
  const params: Record<string, string> = {};
  if (facultyId) {
    params.faculty = String(facultyId);
  }
  return restApiAuthUtil.get<SectionSubjectFaculty[]>('/course/section-subject-faculty/', { params });
}

export async function fetchSubjectById(subjectId: string): Promise<Subject> {
  const subject = await restApiAuthUtil.get<Subject>(`/course/subjects/${subjectId}/`);
  if (subject.units) {
    subject.units.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    subject.units.forEach((u: any) => {
      if (u.sub_units) {
        u.sub_units.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
      }
    });
  }
  return subject;
}

export async function fetchUnitsBySubject(subjectId: string): Promise<UnitBasic[]> {
  const units = await restApiAuthUtil.get<UnitBasic[]>('/course/units/', { params: { subject: subjectId } });
  units.forEach((u: any) => {
    if (u.sub_units) {
      u.sub_units.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
    }
  });
  return units.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

export async function fetchSubjectStructure(subjectId: string) {
  const subject = await fetchSubjectById(subjectId);
  return {
    subject,
    units: subject.units,
  };
}

export async function createSubject(subjectData: any) {
  return restApiAuthUtil.post('/course/subjects/', subjectData);
}

export async function updateSubject(
  subjectId: string,
  payload: Partial<{ subject_name: string; short_code: string | null; description: string | null }>
) {
  return restApiAuthUtil.patch(`/course/subjects/${subjectId}/`, payload);
}

export async function deleteSubject(subjectId: string) {
  await restApiAuthUtil.delete(`/course/subjects/${subjectId}/`);
  return true;
}

export async function createUnit(payload: {
  name: string;
  subject: string;
  order_index?: number;
}) {
  return restApiAuthUtil.post('/course/units/', payload);
}

export async function updateUnit(
  unitId: string,
  payload: Partial<{ name: string; order_index: number }>
) {
  return restApiAuthUtil.put(`/course/units/${unitId}/`, payload);
}

export async function deleteUnit(unitId: string) {
  await restApiAuthUtil.delete(`/course/units/${unitId}/`);
  return true;
}

export async function fetchSubUnitsByUnit(unitId: string, sectionId?: string): Promise<SubUnit[]> {
  const params: Record<string, string> = { unit: unitId };
  if (sectionId) params.section_id = sectionId;
  const subunits = await restApiAuthUtil.get<SubUnit[]>('/course/subunits/', { params });
  return subunits.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

export async function createSubUnit(payload: {
  name: string;
  unit: string;
  order_index?: number;
  content?: string;
}) {
  return restApiAuthUtil.post('/course/subunits/', payload);
}

export async function updateSubUnit(
  subUnitId: string,
  payload: Partial<{ name: string; order_index: number; content?: string }>
) {
  return restApiAuthUtil.patch(`/course/subunits/${subUnitId}/`, payload);
}

export async function deleteSubUnit(subUnitId: string) {
  await restApiAuthUtil.delete(`/course/subunits/${subUnitId}/`);
  return true;
}

export async function fetchSubUnitById(subUnitId: string): Promise<SubUnit> {
  return restApiAuthUtil.get<SubUnit>(`/course/subunits/${subUnitId}/`);
}

export async function fetchVideosBySubUnit(subUnitId: string) {
  return restApiAuthUtil.get('/course/videos/', { params: { sub_unit: subUnitId } });
}

export async function createVideo(payload: any) {
  return restApiAuthUtil.post('/course/videos/', payload);
}

export async function updateVideo(id: string, payload: any) {
  return restApiAuthUtil.put(`/course/videos/${id}/`, payload);
}

export async function deleteVideo(id: string) {
  await restApiAuthUtil.delete(`/course/videos/${id}/`);
  return true;
}

// Helper to map Backend Question -> Frontend Quiz
function mapQuestionToQuiz(q: any) {
  const options = q.mcq_options?.map((o: any) => o.text) || [];
  const correctIndex = q.mcq_options?.findIndex((o: any) => o.is_correct) ?? -1;
  return {
    id: q.id,
    question: q.title, // Map title to question
    options: options,
    correct_answer_index: correctIndex,
    sub_unit: q.sub_unit,
  };
}

// Helper to map Frontend Quiz payload -> Backend Question payload
function mapQuizPayloadToQuestion(payload: any) {
  const mcqOptions = payload.options?.map((opt: string, idx: number) => ({
    text: opt,
    is_correct: idx === payload.correct_answer_index
  })) || [];

  return {
    type: 'mcq_single', // Default to single choice for simple quizzes
    level: 'subunit',
    title: payload.question,
    content: payload.question, // Duplicate title to content for now
    sub_unit: payload.sub_unit,
    categories: ['learn'], // Default category
    mcq_options: mcqOptions,
    marks: 1,
    difficulty: 'easy'
  };
}

export async function fetchQuizzesBySubUnit(subUnitId: string) {
  const questions = await restApiAuthUtil.get<any[]>('/course/questions/', {
    params: {
      sub_unit: subUnitId,
      type: 'mcq_single' // Fetch both types if possible, but start with single
      // Note: Backend might need logic to fetch both mcq_single and mcq_multiple
    }
  });

  // Also fetch multiple choice if needed, or filter client side if the API returns all
  // For now assuming we just want mcq_single as that matches the simple quiz component
  return questions.map(mapQuestionToQuiz);
}

export async function createQuiz(payload: any) {
  const questionPayload = mapQuizPayloadToQuestion(payload);
  const response = await restApiAuthUtil.post('/course/questions/', questionPayload);
  return mapQuestionToQuiz(response);
}

export async function updateQuiz(id: string, payload: any) {
  const questionPayload = mapQuizPayloadToQuestion(payload);
  const response = await restApiAuthUtil.put(`/course/questions/${id}/`, questionPayload);
  return mapQuestionToQuiz(response);
}

export async function deleteQuiz(id: string) {
  await restApiAuthUtil.delete(`/course/questions/${id}/`);
  return true;
}

// Helper for Coding Problems
function mapQuestionToCoding(q: any): CodingProblem {
  return {
    id: q.id,
    title: q.title,
    description: q.content,
    input: '', // Backend doesn't store this, return empty
    test_cases: q.test_cases_basic || []
  };
}

function mapCodingPayloadToQuestion(payload: any) {
  return {
    type: 'coding',
    level: 'subunit',
    title: payload.title,
    content: payload.description,
    sub_unit: payload.sub_unit, // Note: Payload might use sub_unit
    categories: ['practice'],
    test_cases_basic: payload.test_cases,
    marks: 10,
    difficulty: 'medium'
  };
}

export async function fetchCodingProblemsBySubUnit(subUnitId: string) {
  const questions = await restApiAuthUtil.get<any[]>('/course/questions/', {
    params: { sub_unit: subUnitId, type: 'coding' }
  });
  return questions.map(mapQuestionToCoding);
}

export async function createCodingProblem(payload: any) {
  // Ensure sub_unit ID is present. The UI might send it in 'sub_unit'
  const subUnitId = payload.sub_unit || payload.sub_topic;
  if (!subUnitId) throw new Error("SubUnit ID required");

  const questionPayload = {
    ...mapCodingPayloadToQuestion(payload),
    sub_unit: subUnitId
  };

  const response = await restApiAuthUtil.post('/course/questions/', questionPayload);
  return mapQuestionToCoding(response);
}

export async function updateCodingProblem(id: string, payload: any) {
  const questionPayload = mapCodingPayloadToQuestion(payload);
  const response = await restApiAuthUtil.put(`/course/questions/${id}/`, questionPayload);
  return mapQuestionToCoding(response);
}

export async function deleteCodingProblem(id: string) {
  await restApiAuthUtil.delete(`/course/questions/${id}/`);
  return true;
}

export interface Note {
  id: string;
  content: string;
  sub_unit: string;
  subject?: string;
  unit?: string;
  created_at?: string;
  updated_at?: string;
  user?: number | string;
}

export async function fetchNotesBySubUnit(subUnitId: string) {
  return restApiAuthUtil.get<Note[]>('/core/notes/', { params: { sub_unit: subUnitId } });
}

export async function createNote(payload: any) {
  return restApiAuthUtil.post('/core/notes/', payload);
}

export async function updateNote(id: string, payload: any) {
  return restApiAuthUtil.patch(`/core/notes/${id}/`, payload);
}

export async function deleteNote(id: string) {
  await restApiAuthUtil.delete(`/core/notes/${id}/`);
  return true;
}

export async function markSubUnitComplete(subUnitId: string) {
  return restApiAuthUtil.post('/course/student-subject-progress/mark_complete/', { sub_unit_id: subUnitId });
}

export async function markSubUnitVideoWatched(subUnitId: string) {
  return restApiAuthUtil.post('/course/student-subject-progress/mark_video_watched/', { sub_unit_id: subUnitId });
}

export async function fetchSubjectProgress(subjectId: string, userId?: string) {
  const params: any = { subject_id: subjectId };
  if (userId) params.user_id = userId;
  return restApiAuthUtil.get('/course/student-subject-progress/get_progress/', { params });
}

export async function submitQuiz(subUnitId: string, answers: any, scorePercent: number, isPassed: boolean) {
  return restApiAuthUtil.post('/course/student-subject-progress/submit_quiz/', {
    sub_unit_id: subUnitId,
    answers,
    score_percent: scorePercent,
    is_passed: isPassed
  });
}

export async function submitCoding(
  subUnitId: string,
  codingStatus: Record<string, boolean>,
  submissionDetails?: {
    questionId: string;
    language: string;
    code: string;
    testResults: any;
    executionOutput: string;
  }
) {
  const payload: any = {
    sub_unit_id: subUnitId,
    coding_status: codingStatus
  };

  // Add detailed submission data if provided
  if (submissionDetails) {
    payload.question_id = submissionDetails.questionId;
    payload.language = submissionDetails.language;
    payload.code = submissionDetails.code;
    payload.test_results = submissionDetails.testResults;
    payload.execution_output = submissionDetails.executionOutput;
  }

  return restApiAuthUtil.post('/course/student-subject-progress/submit_coding/', payload);
}

export async function fetchUserSubjectProgress(subjectId: string, userId?: string) {
  const params: any = { subject_id: subjectId };
  if (userId) params.user_id = userId;
  return restApiAuthUtil.get('/course/student-subject-progress/get_user_progress_details/', { params });
}

export async function fetchUserStats(userId?: string) {
  const params: any = {};
  if (userId) params.user_id = userId;
  return restApiAuthUtil.get('/course/student-subject-progress/stats/', { params });
}

export async function fetchOverallUserProgress(userId?: string) {
  const params: any = {};
  if (userId) params.user_id = userId;
  return restApiAuthUtil.get('/course/student-subject-progress/progress/', { params });
}

export async function logSubUnitAccess(subUnitId: string) {
  return restApiAuthUtil.post('/course/student-subject-progress/log_access/', { sub_unit_id: subUnitId });
}

export async function unlockSubUnit(subUnitId: string, sectionId: string, isUnlocked: boolean = true) {
  return restApiAuthUtil.post(`/course/subunits/${subUnitId}/unlock/`, {
    section_id: sectionId,
    is_unlocked: isUnlocked
  });
}

const subjectService = {
  getSubjects: fetchSubjects,
  getSubject: fetchSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getUnits: fetchUnitsBySubject,
  createUnit,
  updateUnit,
  deleteUnit,
  getSubUnits: fetchSubUnitsByUnit,
  createSubUnit,
  updateSubUnit,
  deleteSubUnit,
  getSubUnitById: fetchSubUnitById,
  getSubjectStructure: fetchSubjectStructure,
  getVideos: fetchVideosBySubUnit,
  createVideo,
  updateVideo,
  deleteVideo,
  getQuizzes: fetchQuizzesBySubUnit,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getCodingProblems: fetchCodingProblemsBySubUnit,
  createCodingProblem,
  updateCodingProblem,
  deleteCodingProblem,
  getNotes: fetchNotesBySubUnit,
  createNote,
  updateNote,
  deleteNote,
  markSubUnitComplete,
  markSubUnitVideoWatched,
  fetchSubjectProgress,
  submitQuiz,
  submitCoding,
  fetchUserSubjectProgress,
  logSubUnitAccess,
  fetchUserStats,
  fetchOverallUserProgress,
  fetchCollegeSubjects,
  assignSubjectToCollege,
  updateCollegeSubject,
  removeSubjectFromCollege,
  addSubjectToSemester,
  removeSubjectFromSemester,
  getSubjectsForSemester,
  assignFacultyToSectionSubject,
  removeFacultyFromSectionSubject,
  saveAttendance,
  getAttendanceSessions,
  getAssignmentDetails,
  fetchFacultyStats,
  getFacultyAssignments,
  unlockSubUnit,
};

export default subjectService;

export async function fetchSkillTestQuizzesByUnit(unitId: string) {
  return restApiAuthUtil.get('/course/questions/', { params: { unit: unitId, category: 'skill_test' } });
}

export async function fetchSkillTestCodingProblemsByUnit(unitId: string) {
  return restApiAuthUtil.get('/course/questions/', { params: { unit: unitId, category: 'skill_test' } });
}

export async function fetchPracticeCodingProblemsByUnit(unitId: string) {
  return restApiAuthUtil.get('/course/questions/', { params: { unit: unitId, category: 'practice' } });
}

export async function fetchSubjectInstructors(subjectId: string) {
  return restApiAuthUtil.get(`/course/subjects/${subjectId}/instructors/`);
}

export async function addInstructorToSubject(subjectId: string, instructorId: string) {
  return restApiAuthUtil.post(`/course/subjects/${subjectId}/add_instructor/`, { instructor_id: instructorId });
}

export async function removeInstructorFromSubject(subjectId: string, instructorId: string) {
  return restApiAuthUtil.post(`/course/subjects/${subjectId}/remove_instructor/`, { instructor_id: instructorId });
}

export async function fetchAllInstructors() {
  const response = await restApiAuthUtil.get<any>('/auth/users/', { params: { role: 'instructor' } });
  // Handle both paginated and direct array responses
  const instructors = response.results || response || [];
  return instructors;
}

export async function fetchSkillTestQuestions(unitId: string) {
  function safeParseOptions(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(String);
    }
    if (typeof raw === "object") {
      try {
        return Object.values(raw).map(String);
      } catch {
        return [];
      }
    }
    if (typeof raw !== "string") {
      raw = String(raw);
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { }
    try {
      const fixed = raw.replace(/'/g, '"');
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { }
    return raw.split(/[,|;]/).map((s: string) => s.trim()).filter(Boolean);
  }

  // const questions = await restApiAuthUtil.get<any[]>('/course/questions/', { params: { unit: unitId, category: 'skill_test' } });

  // Assuming frontend still expects split lists or combined
  // Need to adjust parsing based on new question endpoint if it changed?
  // Actually, 'fetchSkillTestQuizzesByUnit' above fetched questions directly. 
  // Let's assume 'questions' returns both types or filtered.
  // Wait, I see fetchSkillTestQuizzesByUnit above. 

  // Re-implementing logic from original file:
  // const quizzes = await restApiAuthUtil.get<any[]>('/course/quizzes/', ...); // OLD
  // NEW: endpoint is /course/questions/ filtered by type? Or just /course/questions/ returns all?
  // ViewSet supports type filtering.

  const quizzes = await restApiAuthUtil.get<any[]>('/course/questions/', {
    params: { unit: unitId, category: 'skill_test', type: 'mcq_single' } // and 'mcq_multiple'
  });

  const coding = await restApiAuthUtil.get<any[]>('/course/questions/', {
    params: { unit: unitId, category: 'skill_test', type: 'coding' }
  });

  const mcqQuestions = quizzes.map((q: any) => ({
    id: q.id,
    type: "mcq",
    question: q.title,
    options: safeParseOptions(q.mcq_options?.map((o: any) => o.text)),
    multipleCorrect: q.type === 'mcq_multiple',
    marks: q.marks || 2,
  }));

  const codingQuestions = coding.map((c: any) => ({
    id: c.id,
    type: "coding",
    question: c.title,
    test_cases_basic: c.test_cases_basic,
    test_cases_advanced: c.test_cases_advanced,
    marks: c.marks || 10,
  }));

  return [...mcqQuestions, ...codingQuestions];
}

// Question Bank Management Functions
export async function fetchQuestionsByLevel(level: "subject" | "unit" | "subunit", id: string) {
  const params: any = {};

  if (level === "subject") {
    params.subject = id;
  } else if (level === "unit") {
    params.unit = id;
  } else if (level === "subunit") {
    params.sub_unit = id;
  }

  return restApiAuthUtil.get('/course/questions/', { params });
}

export async function createQuestion(payload: any) {
  return restApiAuthUtil.post('/course/questions/', payload);
}

export async function updateQuestion(questionId: string, payload: any) {
  return restApiAuthUtil.put(`/course/questions/${questionId}/`, payload);
}

export async function deleteQuestion(questionId: string) {
  await restApiAuthUtil.delete(`/course/questions/${questionId}/`);
  return true;
}

// ==================== College-Subject Management ====================

export async function fetchColleges(): Promise<CollegeBasic[]> {
  return restApiAuthUtil.get('/course/colleges/');
}

export async function fetchCollegeSubjects(collegeId?: string): Promise<CollegeSubject[]> {
  const params: Record<string, string> | undefined = collegeId ? { college: collegeId } : undefined;
  return restApiAuthUtil.get('/course/college-subjects/', { params });
}


export async function updateCollegeSubject(id: string, payload: { subject_code?: string }) {
  return restApiAuthUtil.patch<CollegeSubject>(`/course/college-subjects/${id}/`, payload);
}

export async function removeSubjectFromCollege(assignmentId: string): Promise<void> {
  await restApiAuthUtil.delete(`/course/college-subjects/${assignmentId}/`);
}

export async function fetchSubjectsByCollege(collegeId: string): Promise<Subject[]> {
  const assignments = await fetchCollegeSubjects(collegeId);
  return assignments
    .map(a => {
      if (!a.subject_details) return null;
      return {
        ...a.subject_details,
        subject_code: a.subject_code || a.subject_details.short_code
      };
    })
    .filter(Boolean) as Subject[];
}

// ==================== Attendance Management ====================

export interface AttendanceRecord {
  id?: string;
  student: string;
  student_name?: string;
  roll_number?: string;
  is_present: boolean;
}

export interface AttendanceSession {
  id?: string;
  section_subject_faculty: string | number;
  section_name?: string;
  subject_name?: string;
  date: string;
  remarks?: string;
  records: AttendanceRecord[];
}

export async function saveAttendance(payload: AttendanceSession) {
  return restApiAuthUtil.post('/core/attendance-sessions/', payload);
}

export async function getAttendanceSessions(params: Record<string, any>) {
  return restApiAuthUtil.get<AttendanceSession[]>('/core/attendance-sessions/', {
    params
  });
}

export async function getAssignmentDetails(assignmentId: string | number): Promise<SectionSubjectFaculty> {
  return restApiAuthUtil.get<SectionSubjectFaculty>(`/course/section-subject-faculty/${assignmentId}/`);
}

export interface FacultyStats {
  total_courses: number;
  total_students: number;
  total_assessments: number;
  average_attendance: number;
}

export async function fetchFacultyStats(params?: { subject_id?: string; department_id?: string; section_id?: string }): Promise<FacultyStats> {
  return restApiAuthUtil.get<FacultyStats>('/core/faculty/stats/', { params });
}
