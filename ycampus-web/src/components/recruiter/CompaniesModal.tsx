import React, { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Trash, Search, X, Globe, Users } from 'lucide-react';
import { toast } from 'sonner';
import { companyService, Company } from '@/services/companyService';
import CompanyForm from './CompanyForm';

interface CompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanySelect: (company: Company) => void;
}

export default function CompaniesModal({ isOpen, onClose, onCompanySelect }: CompaniesModalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen]);

  useEffect(() => {
    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.domain && company.domain.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCompanies(filtered);
  }, [companies, searchTerm]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await companyService.getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Failed to load companies');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = () => {
    setEditingCompany(null);
    setShowCompanyForm(true);
  };

  const handleCompanyCreated = async (company: Company) => {
    try {
      if (editingCompany) {
        const updatedCompany = await companyService.updateCompany(editingCompany.id, company);
        setCompanies(prev => prev.map(c => c.id === editingCompany.id ? updatedCompany : c));
        toast.success('Company updated successfully');
      } else {
        const newCompany = await companyService.createCompany(company);
        setCompanies(prev => [...prev, newCompany]);
        toast.success('Company created successfully');
      }
      setShowCompanyForm(false);
      setEditingCompany(null);
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error(editingCompany ? 'Failed to update company' : 'Failed to create company');
    }
  };

  const handleSelectCompany = (company: Company) => {
    onCompanySelect(company);
    onClose();
  };

  if (!isOpen) return null;

  if (showCompanyForm) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <CompanyForm
            onClose={() => {
              setShowCompanyForm(false);
              setEditingCompany(null);
            }}
            onCompanyCreated={handleCompanyCreated}
            isEditing={!!editingCompany}
            company={editingCompany || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-blue-500" />
            Select Company
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search and Add Button */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleAddCompany}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 ml-4"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Company</span>
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Companies Count */}
            <div className="mb-4">
              <p className="text-gray-600">
                {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'} found
                {searchTerm && ` for "${searchTerm}"`}
              </p>
            </div>

            {/* Companies Grid */}
            {filteredCompanies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => handleSelectCompany(company)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md cursor-pointer transition-all bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center flex-1">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                          {company.domain && (
                            <div className="text-xs text-gray-500">{company.domain}</div>
                          )}
                          {company.size && (
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <Users className="h-3 w-3 mr-1" />
                              {company.size}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button className="w-full px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded hover:bg-purple-100 transition-colors">
                        Select Company
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new company.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleAddCompany}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-500 hover:bg-purple-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Company
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}