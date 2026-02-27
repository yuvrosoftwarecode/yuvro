import { useState, useEffect } from 'react';
import profileService, { Profile, SocialLinks } from '../services/profileService';

interface ProfileData {
  profile: Profile;
  skills: any[];
  experiences: any[];
  projects: any[];
  education: any[];
  socialLinks: SocialLinks;
  loading: boolean;
  error: string | null;
}

const emptySocialLinks: SocialLinks = {
  id: '',
  github: null,
  linkedin: null,
  portfolio: null,
  email: null,
  website: null,
};

export const useProfileData = (): ProfileData => {
  const [profileData, setProfileData] = useState<ProfileData>({
    profile: {
      full_name: '',
      title: '',
      about: '',
      location: '',
      gender: null,
      links: emptySocialLinks,
      skills: [],
      experiences: [],
      projects: [],
      education: [],
      certifications: [],
      id: '',
      created_at: '',
      updated_at: '',
    },
    skills: [],
    experiences: [],
    projects: [],
    education: [],
    socialLinks: emptySocialLinks,
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
            full_name: profile.full_name || '',
            title: profile.title || '',
            about: profile.about || '',
            location: profile.location || '',
            gender: profile.gender || null,
            links: profile.links || emptySocialLinks,
            skills: profile.skills || [],
            experiences: profile.experiences || [],
            projects: profile.projects || [],
            education: profile.education || [],
            certifications: profile.certifications || [],
            id: profile.id,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            profile_image: profile.profile_image,
            cover_image: profile.cover_image,
            google_id: profile.google_id,
            user: profile.user,
          },
          skills: profile.skills || [],
          experiences: profile.experiences || [],
          projects: profile.projects || [],
          education: profile.education || [],
          socialLinks: profile.links || emptySocialLinks,
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
