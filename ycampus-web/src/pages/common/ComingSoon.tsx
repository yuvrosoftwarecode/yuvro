import React from 'react';
import { Construction } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';

const ComingSoon = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <RoleHeader 
            title="Coming Soon" 
            subtitle={user?.college_name ? `${user.college_name} | We are working hard to bring this feature to life.` : "We are working hard to bring this feature to life."} 
          />
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 max-w-lg w-full text-center space-y-8">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Construction className="h-12 w-12 text-indigo-600" />
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Coming Soon!</h1>
                <p className="text-slate-500 text-lg leading-relaxed">
                  This feature is currently under development. Stay tuned for exciting updates!
                </p>
              </div>

              <div className="pt-6">
                <Button 
                  onClick={() => navigate(-1)}
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full font-semibold h-12 text-md shadow-lg shadow-indigo-100"
                >
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
