import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ChevronRight, Users } from "lucide-react";
import { Department } from "@/services/departmentService";

interface DepartmentListProps {
  departments: Department[];
  onSelectDepartment: (dept: Department) => void;
  selectedId?: string | number;
}

const DepartmentList: React.FC<DepartmentListProps> = ({ departments, onSelectDepartment, selectedId }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {departments.map((dept) => (
        <Card 
          key={dept.id} 
          className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
            selectedId === dept.id ? 'border-orange-500 shadow-md' : 'border-transparent hover:border-orange-200'
          }`}
          onClick={() => onSelectDepartment(dept)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{dept.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{dept.description || 'No description available'}</p>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${selectedId === dept.id ? 'rotate-90' : ''}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DepartmentList;
