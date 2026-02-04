import React from 'react';
import { Camera, MapPin, Calendar, Star, Edit, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface ProfileHeaderProps {
  profile: any;
  profilePic: string;
  coverPic: string;
  onEditClick: () => void;
  onProfilePicUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCoverPicUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  profilePic,
  coverPic,
  onEditClick,
  onProfilePicUpload,
  onCoverPicUpload
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Cover Image */}
      <div className="relative h-64 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        {coverPic && (
          <img
            src={coverPic}
            className="w-full h-full object-cover"
            alt="Cover"
          />
        )}
        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={onCoverPicUpload}
            />
            <div className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-lg backdrop-blur-sm transition-colors">
              <Upload className="h-5 w-5" />
            </div>
          </label>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent opacity-30"></div>
      </div>

      {/* Profile Content */}
      <div className="px-8 pb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between -mt-20 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-6">
            {/* Profile Image */}
            <div className="relative group">
              <div className="w-40 h-40 bg-white rounded-full p-2 shadow-xl">
                <Avatar className="w-full h-full">
                  {profilePic ? (
                    <AvatarImage src={profilePic} alt="Profile" />
                  ) : (
                    <AvatarFallback className="text-4xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                      {profile.full_name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <label className="absolute bottom-3 right-3 cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={onProfilePicUpload}
                />
                <div className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-colors">
                  <Camera className="w-5 h-5" />
                </div>
              </label>
            </div>

            {/* Basic Info */}
            <div className="mt-6 lg:mt-0">
              <div className="flex items-center space-x-4 mb-3">
                <h1 className="text-4xl font-bold text-gray-900">
                  {profile.full_name || "Student User"}
                </h1>
                <div className="flex items-center space-x-2 bg-yellow-50 px-3 py-1 rounded-full">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <span className="font-semibold text-yellow-700">4.8</span>
                  <span className="text-yellow-600 text-sm">(24 reviews)</span>
                </div>
              </div>
              
              <p className="text-xl text-gray-600 mb-3">
                {profile.title || "Aspiring Developer"}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-gray-500">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>{profile.location || "Location not set"}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Joined March 2024</span>
                </div>
                {profile.education.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    <span>{profile.education[0].institution}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 lg:mt-0 flex space-x-3">
            <Button
              onClick={onEditClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg shadow-lg transition-colors"
            >
              <Edit className="h-5 w-5 mr-2" />
              Edit Profile
            </Button>
            <Button
              variant="outline"
              className="px-6 py-3 rounded-lg border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              Share Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;