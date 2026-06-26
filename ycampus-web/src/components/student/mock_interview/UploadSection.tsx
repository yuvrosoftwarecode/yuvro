import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { aiMockInterviewService } from '@/services/aiMockInterviewService';

interface UploadSectionProps {
  onAnalysisComplete: (analysis: any, jdText: string, resumeText: string) => void;
  onBack: () => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onAnalysisComplete, onBack }) => {
  const [jdText, setJdText] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setResumeFile(file);
        toast.success(`Selected PDF: ${file.name}`);
      } else {
        toast.error("Please upload a PDF file only.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setResumeFile(file);
      } else {
        toast.error("Please upload a PDF file only.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jdText.trim()) {
      toast.error("Please enter the Job Description.");
      return;
    }

    if (activeTab === 'upload' && !resumeFile) {
      toast.error("Please upload your Resume PDF.");
      return;
    }

    if (activeTab === 'text' && !resumeText.trim()) {
      toast.error("Please paste your Resume text.");
      return;
    }

    setLoading(true);
    try {
      let analysis;
      if (activeTab === 'upload' && resumeFile) {
        analysis = await aiMockInterviewService.uploadResumePdf(jdText, resumeFile);
      } else {
        analysis = await aiMockInterviewService.uploadResume(jdText, resumeText);
      }
      
      toast.success("Resume and Job Description analyzed successfully!");
      // Pass raw texts so they can be stored server-side for admin review
      const extractedResumeText = activeTab === 'text' ? resumeText : '';
      onAnalysisComplete(analysis, jdText, extractedResumeText);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to analyze document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">JD & Resume AI Interview</h1>
          <p className="text-muted-foreground text-sm">Align your profile with the job requirements to generate custom questions.</p>
        </div>
        <Button variant="outline" onClick={onBack} disabled={loading} className="rounded-xl">
          Back to Library
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Left Column: Job Description */}
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 shrink-0">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                1. Job Description
              </CardTitle>
              <CardDescription>Paste the target job description or role requirements below.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col">
              <Textarea
                placeholder="Paste the job description here (responsibilities, required skills, experience level, etc.)..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="flex-1 min-h-[320px] rounded-xl border-slate-200 focus-visible:ring-indigo-600 resize-none"
                disabled={loading}
              />
            </CardContent>
          </Card>

          {/* Right Column: Candidate Resume */}
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 shrink-0">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                2. Candidate Resume
              </CardTitle>
              <CardDescription>Upload your resume as a PDF or paste your raw profile details.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 rounded-xl shrink-0">
                  <TabsTrigger value="upload" disabled={loading} className="rounded-lg py-2.5">Upload PDF</TabsTrigger>
                  <TabsTrigger value="text" disabled={loading} className="rounded-lg py-2.5">Paste Resume Text</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="flex-1 flex flex-col mt-0">
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-colors flex-1 min-h-[250px] ${
                      dragActive ? "border-indigo-600 bg-indigo-50/30" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/30"
                    }`}
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                  >
                    <input
                      type="file"
                      id="file-upload-input"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileChange}
                      disabled={loading}
                    />
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                      <Upload className="w-6 h-6" />
                    </div>
                    {resumeFile ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-800">{resumeFile.name}</p>
                        <p className="text-xs text-slate-400">{(resumeFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-800">Drag & drop your Resume PDF here</p>
                        <p className="text-xs text-slate-400">Supports PDF format up to 5MB</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="text" className="flex-1 flex flex-col mt-0">
                  <Textarea
                    placeholder="Paste your resume text or profile summary here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="flex-1 min-h-[250px] rounded-xl border-slate-200 focus-visible:ring-indigo-600 resize-none"
                    disabled={loading}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

        </div>

        <div className="flex justify-end pt-2">
          <Button 
            type="submit" 
            size="lg" 
            disabled={loading}
            className="rounded-xl px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing Fit...
              </>
            ) : (
              <>
                Analyze Profile Fit
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
export default UploadSection;
