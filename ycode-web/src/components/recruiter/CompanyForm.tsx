import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Globe, Users, Briefcase, X } from 'lucide-react';
import { toast } from 'sonner';
import { companyService, Company } from '@/services/companyService';

interface CompanyFormProps {
  onClose: () => void;
  onCompanyCreated: (company: Company) => void;
  isEditing?: boolean;
  company?: Company;
  existingCompanies?: Company[];
}

export default function CompanyForm({ onClose, onCompanyCreated, isEditing = false, company, existingCompanies = [] }: CompanyFormProps) {
  const [formData, setFormData] = useState({
    name: company?.name || "",
    domain: company?.domain || "",
    website: company?.website || "",
    size: company?.size || "",
    description: company?.description || "",
    location: company?.location || "",
  });

  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!formData.name.trim()) {
      setNameError(null);
      return;
    }
    
    const isDuplicate = existingCompanies.some(
      c => c.name.toLowerCase() === formData.name.trim().toLowerCase() && 
           (isEditing && company ? c.id !== company.id : true)
    );
    
    if (isDuplicate) {
      setNameError("A company with this name is already registered.");
    } else {
      setNameError(null);
    }
  }, [formData.name, existingCompanies, isEditing, company]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    setLoading(true);
    setNameError(null);
    try {
      let savedCompany: Company;
      
      if (isEditing && company?.id) {
        // Update existing company
        savedCompany = await companyService.updateCompany(company.id, formData);
        toast.success('Company updated successfully');
      } else {
        // Create new company
        savedCompany = await companyService.createCompany(formData);
        toast.success('Company created successfully');
      }
      
      onCompanyCreated(savedCompany);
      onClose();
    } catch (error: any) {
      console.error('Error saving company:', error);
      const errorMessage = error?.data?.name?.[0] || error?.response?.data?.name?.[0] || error?.message;
      if (errorMessage && typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('already registered')) {
         setNameError(errorMessage);
         toast.error('A company with this name is already registered');
      } else {
         toast.error(isEditing ? 'Failed to update company' : 'Failed to create company');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8 bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Building2 className="h-6 w-6 mr-2 text-blue-500" />
          {isEditing ? "Update Company" : "Create New Company"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <Building2 className="h-5 w-5 mr-2 text-purple-500" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${nameError ? 'text-red-600' : 'text-gray-700'}`}>
                Company Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (nameError) setNameError(null);
                }}
                placeholder="e.g., Tech Solutions Inc."
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  nameError ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {nameError && (
                <p className="mt-1 text-sm text-red-600">{nameError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Size
              </label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select Size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501-1000">501-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry/Domain
              </label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="e.g., FinTech, E-commerce, Healthcare"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://company.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., San Francisco, CA"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the company..."
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !!nameError}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Company' : 'Create Company')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}