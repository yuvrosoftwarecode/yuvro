import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface QuestionSolution {
    id?: string;
    question?: string;
    title: string;
    approach: string;
    language: string;
    code: string;
    complexity_analysis?: string;
    is_primary: boolean;
    created_at?: string;
    updated_at?: string;
}

export const fetchSolutions = async (questionId: string) => {
    return restApiAuthUtil.get('/course/question-solutions/', { params: { question: questionId } });
};

export const createSolution = async (data: QuestionSolution) => {
    return restApiAuthUtil.post('/course/question-solutions/', data);
};

export const updateSolution = async (id: string, data: Partial<QuestionSolution>) => {
    return restApiAuthUtil.patch(`/course/question-solutions/${id}/`, data);
};

export const deleteSolution = async (id: string) => {
    return restApiAuthUtil.delete(`/course/question-solutions/${id}/`);
};
