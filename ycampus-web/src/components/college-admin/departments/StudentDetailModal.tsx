import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Student } from "@/services/studentService";
import { User, Mail, Hash, BookOpen, GraduationCap, Calendar, LayoutGrid } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface StudentDetailModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden p-0 rounded-2xl">
        <div className="h-32 bg-gradient-to-r from-orange-400 to-orange-600 w-full" />
        <div className="px-6 pb-6 -mt-16">
          <div className="flex flex-col items-center">
            <div className="h-16" />
            <h2 className="text-2xl font-bold text-gray-900">
              {student.user_details.first_name} {student.user_details.last_name}
            </h2>
            <p className="text-sm text-gray-500 font-mono mb-6">{student.roll_number}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Mail size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-medium">Email Address</p>
                  <p className="text-sm font-semibold text-gray-700 truncate">{student.user_details.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                  <BookOpen size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Department</p>
                  <p className="text-sm font-semibold text-gray-700">{student.department_name}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Batch & Semester</p>
                  <p className="text-sm font-semibold text-gray-700">{student.batch_name} - S{student.semester_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Section</p>
                  <p className="text-sm font-semibold text-gray-700">{student.section_name}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <GraduationCap size={14} />
              <span>Student Member since {new Date(student.created_at || "").toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailModal;
