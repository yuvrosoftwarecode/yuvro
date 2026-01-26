import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Subtopic {
  id: string;
  topic: string;
  name: string;
  content: string | null;
  order_index: number;
  created_at: string;
}

export interface TopicBasic {
  id: string;
  course: string;
  name: string;
  order_index: number;
  created_at: string;
  total_problems?: number;
  solved_problems?: number;
  progress_percentage?: number;
}

export interface TopicWithSubtopics extends TopicBasic {
  subtopics: Subtopic[];
}

export interface Module {
  id: number;
  title: string;
  duration: number;
  content?: string;
}

export interface Course {
  id: string | number;
  short_code?: string;
  name?: string;
  title?: string;
  category: string;
  level?: string;
  duration?: number;
  description?: string;
  price?: number;
  modules?: Module[];
  enrolled_count?: number;
  created_at: string;
  updated_at: string;
  topics: TopicBasic[];
  total_problems?: number;
  solved_problems?: number;
  progress_percentage?: number;
  total_score?: number;
  ai_help_used?: number;
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

export async function fetchCourses(category?: string): Promise<Course[]> {
  const params = category ? { category } : undefined;
  return restApiAuthUtil.get('/course/courses/', { params });
}

export async function fetchCourseById(courseId: string): Promise<Course> {
  return restApiAuthUtil.get(`/course/courses/${courseId}/`);
}

export async function fetchTopicsByCourse(courseId: string): Promise<TopicBasic[]> {
  return restApiAuthUtil.get('/course/topics/', { params: { course: courseId } });
}

export async function fetchCourseStructure(courseId: string) {
  const course = await fetchCourseById(courseId);
  return {
    course,
    topics: course.topics,
  };
}

export async function createCourse(courseData: any) {
  return restApiAuthUtil.post('/course/courses/', courseData);
}

export async function updateCourse(
  courseId: string,
  payload: Partial<{ name: string; short_code: string | null; category: string }>
) {
  return restApiAuthUtil.patch(`/course/courses/${courseId}/`, payload);
}

export async function deleteCourse(courseId: string) {
  await restApiAuthUtil.delete(`/course/courses/${courseId}/`);
  return true;
}

export async function createTopic(payload: {
  name: string;
  course: string;
  order_index?: number;
}) {
  return restApiAuthUtil.post('/course/topics/', payload);
}

export async function updateTopic(
  topicId: string,
  payload: Partial<{ name: string; order_index: number }>
) {
  return restApiAuthUtil.put(`/course/topics/${topicId}/`, payload);
}

export async function deleteTopic(topicId: string) {
  await restApiAuthUtil.delete(`/course/topics/${topicId}/`);
  return true;
}

export async function fetchSubtopicsByTopic(topicId: string): Promise<Subtopic[]> {
  return restApiAuthUtil.get('/course/subtopics/', { params: { topic: topicId } });
}

export async function createSubtopic(payload: {
  name: string;
  topic: string;
  order_index?: number;
  content?: string;
}) {
  return restApiAuthUtil.post('/course/subtopics/', payload);
}

export async function updateSubtopic(
  subtopicId: string,
  payload: Partial<{ name: string; order_index: number; content?: string }>
) {
  return restApiAuthUtil.put(`/course/subtopics/${subtopicId}/`, payload);
}

export async function deleteSubtopic(subtopicId: string) {
  await restApiAuthUtil.delete(`/course/subtopics/${subtopicId}/`);
  return true;
}

export async function fetchVideosBySubtopic(subtopicId: string) {
  return restApiAuthUtil.get('/course/videos/', { params: { sub_topic: subtopicId } });
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
    sub_topic: q.subtopic,
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
    level: 'subtopic',
    title: payload.question,
    content: payload.question, // Duplicate title to content for now
    subtopic: payload.sub_topic,
    categories: ['learn'], // Default category
    mcq_options: mcqOptions,
    marks: 1,
    difficulty: 'easy'
  };
}

export async function fetchQuizzesBySubtopic(subtopicId: string) {
  const questions = await restApiAuthUtil.get<any[]>('/course/questions/', {
    params: {
      subtopic: subtopicId,
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
    level: 'subtopic',
    title: payload.title,
    content: payload.description,
    subtopic: payload.sub_topic, // Note: Payload might use sub_topic
    categories: ['practice'],
    test_cases_basic: payload.test_cases,
    marks: 10,
    difficulty: 'medium'
  };
}

export async function fetchCodingProblemsBySubtopic(subtopicId: string) {
  const questions = await restApiAuthUtil.get<any[]>('/course/questions/', {
    params: { subtopic: subtopicId, type: 'coding' }
  });
  return questions.map(mapQuestionToCoding);
}

export async function createCodingProblem(payload: any) {
  // Ensure subtopic ID is present. The UI might send it in 'sub_topic'
  const subtopicId = payload.sub_topic || payload.subtopic;
  if (!subtopicId) throw new Error("Subtopic ID required");

  const questionPayload = {
    ...mapCodingPayloadToQuestion(payload),
    subtopic: subtopicId
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
  sub_topic: string;
  course?: string;
  topic?: string;
  created_at?: string;
  updated_at?: string;
  user?: number | string;
}

export async function fetchNotesBySubtopic(subtopicId: string) {
  return restApiAuthUtil.get<Note[]>('/course/notes/', { params: { sub_topic: subtopicId } });
}

export async function createNote(payload: any) {
  return restApiAuthUtil.post('/course/notes/', payload);
}

export async function updateNote(id: string, payload: any) {
  return restApiAuthUtil.patch(`/course/notes/${id}/`, payload);
}

export async function deleteNote(id: string) {
  await restApiAuthUtil.delete(`/course/notes/${id}/`);
  return true;
}

export async function markSubtopicComplete(subtopicId: string) {
  return restApiAuthUtil.post('/course/student-course-progress/mark_complete/', { subtopic_id: subtopicId });
}

export async function markSubtopicVideoWatched(subtopicId: string) {
  return restApiAuthUtil.post('/course/student-course-progress/mark_video_watched/', { subtopic_id: subtopicId });
}

export async function fetchCourseProgress(courseId: string) {
  return restApiAuthUtil.get('/course/student-course-progress/get_course_progress/', { params: { course_id: courseId } });
}

export async function submitQuiz(subtopicId: string, answers: any, scorePercent: number, isPassed: boolean) {
  return restApiAuthUtil.post('/course/student-course-progress/submit_quiz/', {
    subtopic_id: subtopicId,
    answers,
    score_percent: scorePercent,
    is_passed: isPassed
  });
}

export async function submitCoding(
  subtopicId: string,
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
    subtopic_id: subtopicId,
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

  return restApiAuthUtil.post('/course/student-course-progress/submit_coding/', payload);
}

export async function fetchUserCourseProgress(courseId: string) {
  return restApiAuthUtil.get('/course/student-course-progress/get_user_progress_details/', { params: { course_id: courseId } });
}

export async function logSubtopicAccess(subtopicId: string) {
  return restApiAuthUtil.post('/course/student-course-progress/log_access/', { subtopic_id: subtopicId });
}

const courseService = {
  getCourses: fetchCourses,
  getCourse: fetchCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getTopics: fetchTopicsByCourse,
  createTopic,
  updateTopic,
  deleteTopic,
  getSubtopics: fetchSubtopicsByTopic,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic,
  getCourseStructure: fetchCourseStructure,
  getVideos: fetchVideosBySubtopic,
  createVideo,
  updateVideo,
  deleteVideo,
  getQuizzes: fetchQuizzesBySubtopic,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getCodingProblems: fetchCodingProblemsBySubtopic,
  createCodingProblem,
  updateCodingProblem,
  deleteCodingProblem,
  getNotes: fetchNotesBySubtopic,
  createNote,
  updateNote,
  deleteNote,
  markSubtopicComplete,
  markSubtopicVideoWatched,
  fetchCourseProgress,
  submitQuiz,
  submitCoding,
  fetchUserCourseProgress,
  logSubtopicAccess,
};

export default courseService;

export async function fetchSkillTestQuizzesByTopic(topicId: string) {
  return restApiAuthUtil.get('/course/quizzes/', { params: { topic: topicId, category: 'skill_test' } });
}

export async function fetchSkillTestCodingProblemsByTopic(topicId: string) {
  return restApiAuthUtil.get('/course/coding-problems/', { params: { topic: topicId, category: 'skill_test' } });
}

export async function fetchPracticeCodingProblemsByTopic(topicId: string) {
  return restApiAuthUtil.get('/course/coding-problems/', { params: { topic: topicId, category: 'practice' } });
}

export async function fetchCourseInstructors(courseId: string) {
  return restApiAuthUtil.get(`/course/courses/${courseId}/instructors/`);
}

export async function addInstructorToCourse(courseId: string, instructorId: string) {
  return restApiAuthUtil.post(`/course/courses/${courseId}/add_instructor/`, { instructor_id: instructorId });
}

export async function removeInstructorFromCourse(courseId: string, instructorId: string) {
  return restApiAuthUtil.post(`/course/courses/${courseId}/remove_instructor/`, { instructor_id: instructorId });
}

export async function fetchAllInstructors() {
  const response = await restApiAuthUtil.get<any>('/auth/users/', { params: { role: 'instructor' } });
  // Handle both paginated and direct array responses
  const instructors = response.results || response || [];
  return instructors;
}

export async function fetchSkillTestQuestions(topicId: string) {
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

  const quizzes = await restApiAuthUtil.get<any[]>('/course/quizzes/', { params: { topic: topicId, category: 'skill_test' } });
  const coding = await restApiAuthUtil.get<any[]>('/course/coding-problems/', { params: { topic: topicId, category: 'skill_test' } });

  const mcqQuestions = quizzes.map((q: any) => ({
    id: q.id,
    type: "mcq",
    question: q.question,
    options: safeParseOptions(q.options),
    multipleCorrect: q.multiple_correct ?? false,
    marks: 2,
  }));

  const codingQuestions = coding.map((c: any) => ({
    id: c.id,
    type: "coding",
    question: c.title,
    test_cases_basic: c.test_cases_basic,
    test_cases_advanced: c.test_cases_advanced,
    marks: 10,
  }));

  return [...mcqQuestions, ...codingQuestions];
}

// Question Bank Management Functions
export async function fetchQuestionsByLevel(level: "course" | "topic" | "subtopic", id: string) {
  const params: any = {};

  if (level === "course") {
    params.course = id;
  } else if (level === "topic") {
    params.topic = id;
  } else if (level === "subtopic") {
    params.subtopic = id;
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
