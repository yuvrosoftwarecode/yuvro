import restApiAuthUtil from '../utils/RestApiAuthUtil';
import { User } from './userService';

export interface TPOProfile {
    id: string;
    user: string;
    user_details: User;
    college: string;
    college_name: string;
    created_at: string;
    updated_at: string;
}

export interface TPOCreateData {
    user: {
        email: string;
        username: string;
        first_name: string;
        last_name: string;
        password?: string;
    };
    college?: string;
}

export const tpoService = {
    getTPOs: async (collegeId?: string | number): Promise<TPOProfile[]> => {
        const url = collegeId ? `/core/tpo/?college=${collegeId}` : '/core/tpo/';
        return await restApiAuthUtil.get<TPOProfile[]>(url);
    },

    getTPO: async (id: string): Promise<TPOProfile> => {
        return await restApiAuthUtil.get<TPOProfile>(`/core/tpo/${id}/`);
    },

    createTPO: async (data: TPOCreateData): Promise<TPOProfile> => {
        return await restApiAuthUtil.post<TPOProfile>('/core/tpo/', data);
    },

    updateTPO: async (id: string, data: Partial<TPOCreateData>): Promise<TPOProfile> => {
        return await restApiAuthUtil.patch<TPOProfile>(`/core/tpo/${id}/`, data);
    },

    deleteTPO: async (id: string): Promise<void> => {
        await restApiAuthUtil.delete(`/core/tpo/${id}/`);
    }
};
