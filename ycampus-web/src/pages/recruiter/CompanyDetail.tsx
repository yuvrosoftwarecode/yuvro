import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { Building2, ArrowLeft, Globe, Users, MapPin, Calendar, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { companyService, Company } from '@/services/companyService';
import CompanyForm from '../../components/recruiter/CompanyForm';

const CompanyDetail: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadCompany();
    }
  }, [companyId]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const data = await companyService.getCompany(parseInt(companyId!));
      setCompany(data);
    } catch (error) {
      console.error('Error loading company:', error);
      toast.error('Failed to load company details');
      navigate('/recruiter/jobs/companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyUpdated = async (updatedCompany: Company) => {
    try {
      const result = await companyService.updateCompany(company!.id, updatedCompany);
      setCompany(result);
      setShowEditForm(false);
      toast.success('Company updated successfully');
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company');
    }
  };

  const headerActions = (
    <>
      <button 
        onClick={() => navigate('/recruiter/jobs/companies')}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Companies</span>
      </button>
      {company && (
        <button 
          onClick={() => setShowEditForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Pencil className="h-4 w-4" />
          <span>Edit Company</span>
        </button>
      )}
    </>
  );

  if (showEditForm && company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader 
              title="Edit Company"
              subtitle="Update company information"
              actions={
                <button 
                  onClick={() => setShowEditForm(false)}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Details</span>
                </button>
              }
            />
            <div className="p-6">
              <CompanyForm
                onClose={() => setShowEditForm(false)}
                onCompanyCreated={handleCompanyUpdated}
                isEditing={true}
                company={company}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader 
            title={company ? company.name : 'Company Details'}
            subtitle="View and manage company information"
            actions={headerActions}
          />

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : company ? (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                {/* Company Header */}
                <div className="px-6 py-8 bg-gradient-to-r from-blue-500 to-purple-600">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-16 w-16">
                      <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-6">
                      <h1 className="text-3xl font-bold text-white">{company.name}</h1>
                      {company.domain && (
                        <p className="text-blue-100 text-lg">{company.domain}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Details */}
                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                      
                      {company.size && (
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Company Size</p>
                            <p className="text-gray-900">{company.size}</p>
                          </div>
                        </div>
                      )}

                      {company.location && (
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="text-gray-900">{company.location}</p>
                          </div>
                        </div>
                      )}

                      {company.website && (
                        <div className="flex items-center">
                          <Globe className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Website</p>
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {company.website}
                            </a>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Added</p>
                          <p className="text-gray-900">
                            {new Date(company.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Description</h3>
                      {company.description ? (
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-700 whitespace-pre-wrap">{company.description}</p>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No description available</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t">
                  <div className="flex justify-end space-x-3">
                    <button 
                      onClick={() => navigate('/recruiter/jobs/companies')}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Back to Companies
                    </button>
                    <button 
                      onClick={() => setShowEditForm(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Edit Company
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Company not found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The company you're looking for doesn't exist or has been removed.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/recruiter/jobs/companies')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Companies
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetail;