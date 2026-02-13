import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Section {
    id: string;
    semester: string;
    semester_number: number;
    name: string;
    created_at: string;
    updated_at: string;
}

export const fetchSections = async (semesterId?: string | number): Promise<Section[]> => {
    const url = semesterId ? `/course/sections/?semester=${semesterId}` : '/course/sections/';
    return await restApiAuthUtil.get<Section[]>(url);
};

export const createSection = async (data: { semester: string | number; name: string }): Promise<Section> => {
    return await restApiAuthUtil.post<Section>('/course/sections/', data);
};

export const updateSection = async (id: string | number, data: Partial<Section>): Promise<Section> => {
    return await restApiAuthUtil.patch<Section>(`/course/sections/${id}/`, data);
};

export const deleteSection = async (id: string | number): Promise<void> => {
    await restApiAuthUtil.delete(`/course/sections/${id}/`);
};

const sectionService = {
    getSections: fetchSections,
    createSection,
    updateSection,
    deleteSection,
};

export default sectionService;
