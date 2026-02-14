import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FacultyProfile } from "@/services/facultyService";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Mail, User as UserIcon, Search, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FacultyListProps {
  faculties: FacultyProfile[];
  onEdit: (faculty: FacultyProfile) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const FacultyList: React.FC<FacultyListProps> = ({ faculties, onEdit, onDelete, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaculties = faculties.filter(f => 
    `${f.user_details.first_name} ${f.user_details.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.user_details.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.department_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
        </div>
        <p className="text-slate-500 font-medium animate-pulse text-sm">Loading faculty records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, email or department..."
            className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-none rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">
                Total Records: <span className="text-indigo-600 font-bold">{filteredFaculties.length}</span>
            </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredFaculties.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-slate-50 text-slate-300 mb-4 border border-slate-100">
              <UserIcon className="h-10 w-10" />
            </div>
            <p className="text-slate-600 font-bold text-xl">No faculty members matched</p>
            <p className="text-slate-400 max-w-xs mx-auto mt-2 text-sm leading-relaxed">
              {searchTerm ? "Adjust your search criteria or clear the filters to view all faculty staff." : "Start by adding your first faculty member to the directory."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b-slate-200">
                <TableHead className="w-[300px] font-bold text-slate-600 py-4 uppercase text-[10px] tracking-widest pl-6">Faculty Staff</TableHead>
                <TableHead className="font-bold text-slate-600 py-4 uppercase text-[10px] tracking-widest">Departments</TableHead>
                <TableHead className="font-bold text-slate-600 py-4 uppercase text-[10px] tracking-widest">Designation</TableHead>
                <TableHead className="w-[120px] text-right py-4 uppercase text-[10px] tracking-widest pr-6">Quick Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFaculties.map((faculty) => (
                <TableRow key={faculty.id} className="group hover:bg-slate-25 transition-all border-b-slate-100 last:border-0">
                  <TableCell className="py-5 pl-6">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 uppercase shadow-sm transition-transform group-hover:scale-105">
                        {faculty.user_details.first_name[0]}{faculty.user_details.last_name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm mb-0.5">
                          {faculty.user_details.first_name} {faculty.user_details.last_name}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <Mail className="h-3 w-3" />
                          {faculty.user_details.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex flex-wrap gap-2 max-w-[280px]">
                        <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-tighter text-indigo-400">Primary</span>
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-50 shadow-none px-2 py-0.5 rounded-lg text-[11px] font-bold">
                                {faculty.department_name}
                                </Badge>
                            </div>
                            {faculty.linked_departments_data && faculty.linked_departments_data.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-slate-300">Linked</span>
                                    <div className="flex flex-wrap gap-1">
                                        {faculty.linked_departments_data.map(dept => (
                                            <Badge key={dept.id} variant="outline" className="bg-white text-slate-500 border-slate-200 px-1.5 py-0 rounded-md text-[10px] font-medium shadow-none">
                                                {dept.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex flex-col">
                        <span className="text-slate-700 font-bold text-xs">{faculty.designation || 'Faculty'}</span>
                        <span className="text-[9px] text-slate-400 font-bold tracking-tight uppercase mt-0.5">Rank & Role</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-5 pr-6">
                    <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => onEdit(faculty)}
                                    className="h-8 w-8 rounded-lg border-slate-200 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-none"
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-800 text-white border-0 text-[10px] font-bold py-1">Edit Faculty</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => onDelete(faculty.id)}
                                    className="h-8 w-8 rounded-lg border-slate-200 hover:border-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-none"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-rose-800 text-white border-0 text-[10px] font-bold py-1">Delete Member</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default FacultyList;
