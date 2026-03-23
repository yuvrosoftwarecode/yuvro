import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TPOProfile } from "@/services/tpoService";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Mail, User as UserIcon, Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TPOListProps {
    tpos: TPOProfile[];
    onEdit: (tpo: TPOProfile) => void;
    onDelete: (id: string) => void;
    loading?: boolean;
}

const TPOList: React.FC<TPOListProps> = ({ tpos, onEdit, onDelete, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTPOs = tpos.filter(t =>
        `${t.user_details.first_name} ${t.user_details.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.user_details.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.college_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
                </div>
                <p className="text-slate-500 font-medium animate-pulse text-sm">Loading TPO records...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, email..."
                        className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-none rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500">
                        Total Records: <span className="text-indigo-600 font-bold">{filteredTPOs.length}</span>
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {filteredTPOs.length === 0 ? (
                    <div className="text-center py-20 px-6">
                        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-slate-50 text-slate-300 mb-4 border border-slate-100">
                            <UserIcon className="h-10 w-10" />
                        </div>
                        <p className="text-slate-600 font-bold text-xl">No TPO members matched</p>
                        <p className="text-slate-400 max-w-xs mx-auto mt-2 text-sm leading-relaxed">
                            {searchTerm ? "Adjust your search criteria or clear the filters to view all TPO staff." : "Start by adding your first TPO member to the directory."}
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b-slate-200">
                                <TableHead className="w-[300px] font-bold text-slate-600 py-4 uppercase text-[10px] tracking-widest pl-6">TPO Staff</TableHead>
                                <TableHead className="font-bold text-slate-600 py-4 uppercase text-[10px] tracking-widest">College</TableHead>
                                <TableHead className="w-[120px] text-right py-4 uppercase text-[10px] tracking-widest pr-6">Quick Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTPOs.map((tpo) => (
                                <TableRow key={tpo.id} className="group hover:bg-slate-25 transition-all border-b-slate-100 last:border-0">
                                    <TableCell className="py-5 pl-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-11 w-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 uppercase shadow-sm transition-transform group-hover:scale-105">
                                                {tpo.user_details.first_name[0]}{tpo.user_details.last_name[0]}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-sm mb-0.5">
                                                    {tpo.user_details.first_name} {tpo.user_details.last_name}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                                    <Mail className="h-3 w-3" />
                                                    {tpo.user_details.email}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-slate-400" />
                                            <span className="text-slate-700 font-bold text-xs">{tpo.college_name}</span>
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
                                                            onClick={() => onEdit(tpo)}
                                                            className="h-8 w-8 rounded-lg border-slate-200 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-none"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-slate-800 text-white border-0 text-[10px] font-bold py-1">Edit TPO</TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => onDelete(tpo.id)}
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

export default TPOList;
