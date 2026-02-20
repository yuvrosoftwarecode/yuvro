import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { departmentService, Department } from "@/services/departmentService";
import { batchService, Batch } from "@/services/batchService";
import { studentService } from "@/services/studentService";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload, FileType, AlertCircle, CheckCircle2, Download } from "lucide-react";

interface StudentBulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const StudentBulkImportModal: React.FC<StudentBulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const [departments, setDepartments] = useState<Department[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);

    const [formData, setFormData] = useState({
        department_id: '',
        batch_id: '',
    });

    const [resultSummary, setResultSummary] = useState<{
        total: number;
        created: number;
        errors: { row: number; error: string }[];
    } | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            setFile(null);
            setResultSummary(null);
            setFormData({ department_id: '', batch_id: '' });
        }
    }, [isOpen]);

    const loadInitialData = async () => {
        try {
            setLoadingData(true);
            const collegeId = (user as any)?.college_id;
            const depts = await departmentService.getDepartments(collegeId);
            setDepartments(depts);
        } catch (err) {
            console.error("Failed to load departments", err);
        } finally {
            setLoadingData(false);
        }
    };

    const handleDepartmentChange = async (val: string) => {
        setFormData(prev => ({ ...prev, department_id: val, batch_id: '' }));
        setBatches([]);
        if (val) {
            const bts = await batchService.getBatches(val);
            setBatches(bts);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const isCsv = selectedFile.name.endsWith('.csv');
            const isXlsx = selectedFile.name.endsWith('.xlsx');
            if (isCsv || isXlsx) {
                setFile(selectedFile);
                setResultSummary(null);
            } else {
                toast.error("Please select a CSV or Excel (.xlsx) file");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        try {
            setSubmitting(true);
            const result = await studentService.bulkImport(file, {
                department: formData.department_id,
                batch: formData.batch_id
            });

            setResultSummary(result);
            if (result.created > 0) {
                toast.success(`Successfully imported ${result.created} students`);
                onSuccess();
            } else if (result.total > 0 && result.errors.length > 0) {
                toast.error(`Import failed for ${result.errors.length} records. See details below.`);
            } else {
                toast.error("Failed to import any students. Check file format or data.");
            }
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.response?.data?.error || err.message || "Failed to import students. Check file format.";
            toast.error(errorMessage, {
                duration: 5000,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const downloadTemplate = () => {
        const headers = "first_name,last_name,email,roll_number,phone_number,admission_type,department,batch";
        const blob = new Blob([headers], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'student_import_template.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-2 border-b">
                    <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Upload className="h-5 w-5 text-orange-600" />
                        Bulk Import Students
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                    {!resultSummary ? (
                        <form id="bulk-import-form" onSubmit={handleSubmit} className="space-y-6">
                            <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 mb-4">
                                <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2 mb-2">
                                    <AlertCircle className="h-4 w-4" />
                                    File Instructions (CSV or XLSX)
                                </h4>
                                <ul className="text-xs text-orange-700 space-y-1 list-disc ml-4">
                                    <li>Required columns: <strong>first_name, last_name, email, roll_number</strong></li>
                                    <li>Optional: <strong>phone_number, admission_type, department, batch</strong></li>
                                    <li>If department/batch columns are empty, the selected defaults below will be used.</li>
                                    <li>Admission type should be 'regular' or 'lateral_entry'.</li>
                                </ul>
                                <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 h-auto text-xs text-orange-600 font-bold mt-2"
                                    onClick={downloadTemplate}
                                >
                                    <Download className="h-3 w-3 mr-1" /> Download Template
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Default Department</Label>
                                    <Select
                                        value={formData.department_id}
                                        onValueChange={handleDepartmentChange}
                                    >
                                        <SelectTrigger className="bg-white border-gray-200 focus:ring-orange-500">
                                            <SelectValue placeholder="Select Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((d) => (
                                                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Default Batch</Label>
                                    <Select
                                        value={formData.batch_id}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, batch_id: val }))}
                                        disabled={!formData.department_id}
                                    >
                                        <SelectTrigger className="bg-white border-gray-200 focus:ring-orange-500">
                                            <SelectValue placeholder="Select Batch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {batches.map((b) => (
                                                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-gray-700 font-medium">Upload File (CSV or Excel)</Label>
                                <div
                                    className={`border-2 border-dashed rounded-xl p-8 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${file ? 'border-orange-500 bg-orange-50/30' : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'}`}
                                    onClick={() => document.getElementById('csv-upload')?.click()}
                                >
                                    <input
                                        type="file"
                                        id="csv-upload"
                                        className="hidden"
                                        accept=".csv,.xlsx"
                                        onChange={handleFileChange}
                                    />
                                    {file ? (
                                        <>
                                            <FileType className="h-12 w-12 text-orange-500 mb-2" />
                                            <span className="text-sm font-bold text-gray-900">{file.name}</span>
                                            <span className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs text-red-500 mt-4 h-8"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFile(null);
                                                }}
                                            >
                                                Remove and Change
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-12 w-12 text-gray-300 mb-2" />
                                            <span className="text-sm font-medium text-gray-600">Click to browse or drag and drop</span>
                                            <span className="text-xs text-gray-400 mt-1">Support .csv and .xlsx (Excel) format</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                                    <span className="text-2xl font-bold text-gray-900">{resultSummary.total}</span>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">Processed</p>
                                </div>
                                <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <span className="text-2xl font-bold text-green-700">{resultSummary.created}</span>
                                    </div>
                                    <p className="text-xs text-green-600 uppercase tracking-wider font-semibold">Success</p>
                                </div>
                                <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                        <span className="text-2xl font-bold text-red-700">{resultSummary.errors.length}</span>
                                    </div>
                                    <p className="text-xs text-red-600 uppercase tracking-wider font-semibold">Errors</p>
                                </div>
                            </div>

                            {resultSummary.errors.length > 0 && (
                                <div className="space-y-3">
                                    <h5 className="font-bold text-sm text-gray-700 px-1">Import Errors</h5>
                                    <div className="max-h-[250px] overflow-y-auto rounded-lg border border-red-100 bg-red-50/10 custom-scrollbar">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-red-50 text-red-700 font-bold uppercase tracking-wider border-b border-red-100 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 w-16">Row</th>
                                                    <th className="px-3 py-2">Error Description</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-50">
                                                {resultSummary.errors.map((err, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-3 py-2 font-mono font-bold text-red-500">{err.row}</td>
                                                        <td className="px-3 py-2 text-gray-700">{err.error}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {resultSummary.created > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-green-800">Import completed successfully!</p>
                                        <p className="text-xs text-green-700 mt-1">Added {resultSummary.created} new students to your college system.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
                    {resultSummary ? (
                        <Button
                            className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto px-8"
                            onClick={onClose}
                        >
                            Done
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={submitting}
                                className="border-gray-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                form="bulk-import-form"
                                type="submit"
                                className="bg-orange-600 hover:bg-orange-700 text-white px-8 min-w-[140px]"
                                disabled={submitting || !file}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    'Start Import'
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
