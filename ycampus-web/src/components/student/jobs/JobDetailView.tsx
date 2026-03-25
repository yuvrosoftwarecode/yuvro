import React from 'react';
import { 
  Building2, 
  MapPin, 
  IndianRupee, 
  Calendar, 
  ChevronRight, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StudentJob } from './JobCard';

interface JobDetailViewProps {
  job: StudentJob | null;
  onApply: (job: StudentJob) => void;
  onBack: () => void;
}

export const JobDetailView: React.FC<JobDetailViewProps> = ({ job, onApply, onBack }) => {
  if (!job) return null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <button 
        onClick={onBack}
        className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        Back to Jobs
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">{job.role}</h1>
                  <Badge className="bg-emerald-50 text-emerald-600 border-none font-semibold">
                    {job.companyType}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-xl font-medium text-gray-700">
                  <Building2 className="h-6 w-6 text-gray-400" />
                  <span>{job.companyName}</span>
                </div>

                <div className="flex flex-wrap gap-6 text-gray-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-gray-900">
                    <IndianRupee className="h-5 w-5" />
                    <span>₹ {job.ctcTotal} LPA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>Deadline: {job.deadline}</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => onApply(job)}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-10 h-12 rounded-xl text-lg font-bold shadow-lg shadow-gray-200"
              >
                Apply Now
              </Button>
            </div>

            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Selection Process</h2>
                <div className="flex items-center gap-4 py-4 overflow-x-auto">
                  {['Online Test', 'Technical Round', 'HR Round'].map((step, i) => (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-2 min-w-max">
                        <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-600">{step}</span>
                      </div>
                      {i < 2 && <div className="h-px w-12 bg-gray-200" />}
                    </React.Fragment>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
                <p className="text-gray-600 leading-relaxed">
                  We are looking for a highly motivated {job.role} to join our team...
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Requirements</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>Minimum 8.0 CGPA in B.Tech</li>
                  <li>Deep understanding of {job.skills.join(', ')}</li>
                  <li>Good communication and problem solving skills</li>
                </ul>
              </section>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Eligibility Criteria
            </h3>
            
            <div className="space-y-4">
              {[
                { label: 'Minimum CGPA', value: '8.0' },
                { label: 'Backlogs', value: '0 Active' },
                { label: 'Branch', value: 'CSE, IT, ECE' },
                { label: 'Batch', value: '2026' }
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed font-medium">
                You meet all the eligibility criteria for this role. Good luck with your application!
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-bold mb-2">Need Help?</h3>
            <p className="text-blue-100 text-sm mb-4">
              Join the official placement discussion channel to connect with peers and mentors.
            </p>
            <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30 border-none text-white font-semibold">
              Join Community
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailView;
