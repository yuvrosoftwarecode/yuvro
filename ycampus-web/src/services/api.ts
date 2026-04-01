import axios from 'axios';

const BASE_URL = 'http://localhost:9090';

// Create axios instance with default headers
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

const adminApiService = {
    
    addCourse: async (data) => {
        const response = await api.post('/courses', data);
        return response.data;
    },

    updateCourse: async (courseId, data) => {
        const response = await api.put(`/courses/${courseId}`, data);
        return response.data;
    },

    addModule: async (data) => {
        const response = await api.post('/modules', data);
        return response.data;
    },

    addTopic: async (data) => {
        const response = await api.post('/topics', data);
        return response.data;
    },

    getCourses: async() => {
        const response = await api.get('/courses/get-all-courses');
        return response.data;
    },

    getCourse: async() => {
        const response = await api.get('/courses');
        return response.data;
    },

    getModulesByCourse: async (courseId) => {
        const response = await api.get(`/courses/${courseId}/modules`);
        return response.data;
    },

    getTopicsByModule: async (moduleId) => {
        const response = await api.get(`/modules/${moduleId}/topics`);
        return response.data;
    },
    
    updateModule: async (moduleId, data) => {
        const response = await api.put(`/modules/${moduleId}`, data);
        return response.data;
    },

    deleteModule: async (moduleId) => {
        const response = await api.delete(`/modules/${moduleId}`);
        return response.data;
    },

    deleteTopic: async (topicId) => {
        const response = await api.delete(`/topics/${topicId}`);
        return response.data;
    },
    deleteCourse: async (courseId) => {
        const response = await api.delete(`/courses/${courseId}`);
        return response.data;
    },
    addBatch: async (data) => {
        const response = await api.post('/batches', data);
        return response.data;
    },
    updateBatch: async (batchId, data) => {
        const response = await api.put(`/batches/${batchId}`, data);
        return response.data;
    },
    getBatches: async () => {
        const response = await api.get('/batches/get-all-batches');
        return response.data;
    },
    deleteBatch: async (batchId) => {
        const response = await api.delete(`/batches/${batchId}`);
        return response.data;
    },
    getBatchesByCourse: async (courseId) => {
        const response = await api.get(`/courses/${courseId}/batches`);
        return response.data;
    },
    addCandidate: async (data) => {
        const response = await api.post('/candidates', data);
        return response.data;
    },
    addCandidateToBatches: async (data) => {
        const response = await api.post('/batches/add-candidates-to-batch', data);
        return response.data;
    },
    deleteCandidate: async (candidateId) => {
        const response = await api.delete(`/candidates/${candidateId}`);
        return response.data;
    },
    getCandidate: async (candidateId) => {
        const response = await api.get(`/candidates/${candidateId}`);
        return response.data;
    },
    getCandidateBatches: async (candidateId) => {
        const response = await api.get(`/candidates/${candidateId}/batches`);
        return response.data;
    },
    updateCandidate: async (candidateId, data) => {
        const response = await api.put(`/candidates/${candidateId}`, data);
        return response.data;
    },
    saveTest: async (data) => {
        const response = await api.post('/questions', data);
        return response.data;
    },
    addMcqOption: async (option, questionId) => {
        const payload = {
            option,
            question: `${BASE_URL}/questions/${questionId}`
        };
        const response = await api.post('/mcq-options', payload);
        return response.data;
    },
    getQuestionsByTopicId: async (topicId,candidateId) => {
        const response = await api.get('/practices/questions-to-practice',{
            params: {
              topicId: topicId,
              candidateId: candidateId
            }
        });
        return response.data;
    },
    getCoursesByBatch: async (batchId) => {
        const response = await api.get(`/batches/${batchId}/courses`);
        return response.data;
    },
    updateTopic: async (topicId, data) => {
        const response = await api.put(`/topics/${topicId}`, data);
        return response.data;
    },
    attemptPractice: async (data) => {
        const response = await api.post('/practices/attempt-practice', data);
        return response.data;
    },
    validateQuestion: async (data) => {
        const response = await api.post('/questions/validate-question', data);
        return response.data;
    },
    submitPractice: async (data) => {
        const response = await api.get('/practices/submit-practice', data);
        return response.data;
    },
    createAssessment: async (data) => {
        const response = await api.post('/assessments/create-assessment', data);
        return response.data;
    },
    createQuestions: async (data) => {
        const response = await api.post('/assessments/save-assessment-question', data);
        return response.data;
    },
    getAssessmentsByBatch: async (batchId,candidateId) => {
        const response = await api.get('/assessments/get-all-assessments',{params: {
            batchId: batchId,
            candidateId: candidateId
          }});
        return response.data;
    },
    getFacultyAssessmentsByBatch: async (candidateId)=> {
        const response = await api.get('/assessments/get-my-assessments',{ params : {
            createdBy: candidateId
        }});
        return response.data;
    },
    deleteAssessment: async (assessmentId) => {
        const response = await api.delete(`/assessments/${assessmentId}`);
        return response.data;
    },
    getAssessmentQuestions: async (assessmentId) => {
        const response = await api.get(`/assessments/${assessmentId}/questions`);
        return response.data;
    },
    sendAssessment: async (assessmentId) => {
        const response = await api.put(`/assessments/send-assessment/${assessmentId}`);
        return response.data;
    },
    saveAssessmentAnswer: async (payload) => {
        const response = await api.post('/assessments/save-assessment-answer',payload);
        return response.data;
    },
    attemptAssessment: async ({candidateId,assessmentId}) => {
        console.log({candidateId,assessmentId})
        const response = await api.put('/assessments/attempt-assessment',null,{
            params : {candidateId,assessmentId}
        })
        return response.data;
    },
    getAssessmentsById: async (assessmentId) => {
        const response = await api.get(`/assessments/${assessmentId}`);
        return response.data;
    },
    submitAssessment: async (candidateId,assessmentId) => {
        const response = await api.put('/assessments/submit-assessment',null,{
            params:{
                candidateId:candidateId,assessmentId:assessmentId
            }
        })
        return response.data;
    },
    getCandidateAssessment: async (candidateId,assessmentId) => {
        const response = await api.get('/assessments/get-assessment-details',{
            params: {
                candidateId,assessmentId
            }
        })
        return response.data;
    },
    createTask: async (data) => {
        const response = await api.post('/tasks/create-task',data);
        return response.data
    },
    updateTask: async (taskId, data) => {
        const response = await api.put(`/tasks/${taskId}`, data);
        return response.data;
    },
    deleteTask: async (taskId) => {
        const response = await api.delete(`/tasks/${taskId}`);
        return response.data;
    },
    getTasks: async(batchId) => {
        const response = await api.get('/tasks/get-all-tasks',{
            params: {
                batchId
            }
        });
        return response.data
    },
    sendTask: async (taskId) => {
        const response = await api.put(`/tasks/send-task/${taskId}`);
        return response.data;
    },
    getCandidateTasks: async(candidateId) => {
        const response = await api.get('/tasks/get-candidate-tasks',{
            params: {
                candidateId
            }
        });
        return response.data
    },
    submitCandidateTask: async (content, candidateTaskId) => {
        const response = await api.put('/tasks/submit-candidate-task', {
            content,
            candidateTaskId
        });
        return response.data;
    },
    attemptTask: async (candidateTaskId) => {
        const response = await api.put(`/tasks/attempt-candidate-tasks/${candidateTaskId}`);
        return response.data;
    },
    getTaskCandidates: async (taskId) => {
        const response = await api.get(`/tasks/view-task-candidates/${taskId}`);
        return response.data;
    },
    getCandidateTask: async (candidateTaskId) => {
        const response = await api.get(`/tasks/view-task-answer/${candidateTaskId}`);
        return response.data;
    },
    saveFeedback: async (feedback) => {
        const response = await api.post('/feedbacks/save-feedback', feedback);
        return response.data;
    },
    getFeedbacks: async (candidateTaskId) => {
        const response = await api.get('/feedbacks/get-feedbacks', {
            params: { candidateTaskId}
        });
        return response.data;
    },
    getAssessmentResults: async (assessmentId) => {
        const response = await api.get('/assessments/get-assessment-candidates',{
            params: {
                assessmentId
            }
        }   );
        return response.data;
    },
    getResponses: async (assessmentId) => {
        const response = await api.get('/assessments/assessment-stats',{
            params: {
                assessmentId
            }
        }); 
        return response.data;
    },
    getBatchCandidates: async (batchId) => {
        const response = await api.get('/candidates/get-batch-candidates', {
            params: {
                batchId
            }
        });
        return response.data;
    },
    saveAttendance: async (attendanceData) => {
        const response = await api.post('/attendence/save-attendence', attendanceData);
        return response.data;
    },
    getAttendance: async (attendenceDate, batchId) => {
        const response = await api.get('/attendence/get-attendence', {
            params: {
                attendenceDate,
                batchId
            }
        });
        return response.data;
    },
    downloadAssessmentReport: async (assessmentId) => {
        const response = await api.get(`/assessments/download/${assessmentId}/report` , {
            responseType: 'blob'
        });
        return response;
    },
    downloadTaskReport: async (taskId) => {
        const response = await api.get(`/tasks/download/${taskId}/report` , {
            responseType: 'blob'
        });
        return response;
    }
}


export default adminApiService;