import restApiAuthUtil from '../utils/RestApiAuthUtil';
import { User } from './userService';

export interface PlacementOfficerProfile {
    id: string;
    user: string;
    user_details: User;
    college: string;
    college_name: string;
    created_at: string;
    updated_at: string;
}

export interface PlacementOfficerCreateData {
    user: {
        email: string;
        username: string;
        first_name: string;
        last_name: string;
        password?: string;
    };
    college?: string;
}

export const placementOfficerService = {
    getPlacementOfficers: async (collegeId?: string | number): Promise<PlacementOfficerProfile[]> => {
        const url = collegeId ? `/core/placement-officer/?college=${collegeId}` : '/core/placement-officer/';
        return await restApiAuthUtil.get<PlacementOfficerProfile[]>(url);
    },

    getPlacementOfficer: async (id: string): Promise<PlacementOfficerProfile> => {
        return await restApiAuthUtil.get<PlacementOfficerProfile>(`/core/placement-officer/${id}/`);
    },

    createPlacementOfficer: async (data: PlacementOfficerCreateData): Promise<PlacementOfficerProfile> => {
        return await restApiAuthUtil.post<PlacementOfficerProfile>('/core/placement-officer/', data);
    },

    updatePlacementOfficer: async (id: string, data: Partial<PlacementOfficerCreateData>): Promise<PlacementOfficerProfile> => {
        return await restApiAuthUtil.patch<PlacementOfficerProfile>(`/core/placement-officer/${id}/`, data);
    },

    deletePlacementOfficer: async (id: string): Promise<void> => {
        await restApiAuthUtil.delete(`/core/placement-officer/${id}/`);
    }
};
