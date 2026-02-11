import { useState, useEffect } from 'react';
import profileService, { Profile } from '../services/profileService';

interface ProfileData {
  profile: Profile;
  skills: any[];
  experiences: any[];
  projects: any[];
  education: any[];
  socialLinks: any;
  loading: boolean;
  error: string | null;
}

export const useProfileData = (): ProfileData => {
  const [profileData, setProfileData] = useState<ProfileData>({
    profile: {
      name: '',
      full_name: '',
      title: '',
      about: '',
      location: '',
      links: null,
      skills: [],
      experiences: [],
      projects: [],
      education: [],
      certifications: []
    },
    skills: [],
    experiences: [],
    projects: [],
    education: [],
    socialLinks: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchProfileData = async (retryCount: number = 0) => {
      try {
        setProfileData(prev => ({ ...prev, loading: true, error: null }));
        
        const profile = await profileService.fetchProfileDetail();
        
        setProfileData({
          profile: {
            name: profile.full_name || profile.name || '',
            full_name: profile.full_name || '',
            title: profile.title || '',
            about: profile.about || '',
            location: profile.location || '',
            links: profile.links || null,
            skills: profile.skills || [],
            experiences: profile.experiences || [],
            projects: profile.projects || [],
            education: profile.education || [],
            certifications: profile.certifications || []
          },
          skills: profile.skills || [],
          experiences: profile.experiences || [],
          projects: profile.projects || [],
          education: profile.education || [],
          socialLinks: profile.links || null,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching profile data:', error);
        
        if (error instanceof Error && error.message.includes('Network error') && retryCount < 3) {
          console.log(`Retrying profile data fetch (attempt ${retryCount + 1}/3)...`);
          setTimeout(() => {
            fetchProfileData(retryCount + 1);
          }, 1000 * (retryCount + 1)); 
          return;
        }
        
        setProfileData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load profile data'
        }));
      }
    };

    fetchProfileData();
  }, []);

  return profileData;
};