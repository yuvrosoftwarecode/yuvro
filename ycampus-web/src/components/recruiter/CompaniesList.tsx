import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Pencil, Trash, Search, X, Globe, Users, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { companyService, Company } from '@/services/companyService';
import CompanyForm from './CompanyForm';

interface CompaniesListProps {
  onClose: () => void;
  onCompanySelect?: (company: Company) => void;
  showSelectMode?: boolean;
}

export default function CompaniesList({ onClose, onCompanySelect, showSelectMode = false }: CompaniesListProps) {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [companiesPerPage] = useState(10);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    // Filter companies based on search term
    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.domain && company.domain.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCompanies(filtered);
    setCurrentPage(1); // Reset to first page when searching
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

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setShowCompanyForm(true);
  };

  const handleCompanyCreated = async (company: Company) => {
    try {
      if (editingCompany) {
        // Update existing company
        const updatedCompany = await companyService.updateCompany(editingCompany.id, company);
        setCompanies(prev => prev.map(c => c.id === editingCompany.id ? updatedCompany : c));
        toast.success('Company updated successfully');
      } else {
        // Create new company
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

  const handleDeleteCompany = async (id: number) => {
    try {
      await companyService.deleteCompany(id);
      setCompanies(prev => prev.filter(c => c.id !== id));
      setDeleteConfirm(null);
      toast.success('Company deleted successfully');
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('Failed to delete company');
    }
  };

  const handleSelectCompany = (company: Company) => {
    if (onCompanySelect) {
      onCompanySelect(company);
      onClose();
    }
  };

  const handleViewCompany = (company: Company) => {
    if (!showSelectMode) {
      navigate(`/recruiter/jobs/companies/${company.id}`);
    }
  };

  // Pagination logic
  const indexOfLastCompany = currentPage * companiesPerPage;
  const indexOfFirstCompany = indexOfLastCompany - companiesPerPage;
  const currentCompanies = filteredCompanies.slice(indexOfFirstCompany, indexOfLastCompany);
  const totalPages = Math.ceil(filteredCompanies.length / companiesPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (showCompanyForm) {
    return (
      <CompanyForm
        onClose={() => {
          setShowCompanyForm(false);
          setEditingCompany(null);
        }}
        onCompanyCreated={handleCompanyCreated}
        isEditing={!!editingCompany}
        company={editingCompany || undefined}
      />
    );
  }

  return (
    <div className="mb-8 bg-white shadow rounded-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Building2 className="h-6 w-6 mr-2 text-blue-500" />
          Companies Management
          {showSelectMode && <span className="text-sm font-normal text-gray-500 ml-2">(Select a company)</span>}
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

          {/* Companies Table */}
          {currentCompanies.length > 0 ? (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Website
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentCompanies.map((company) => (
                    <tr 
                      key={company.id} 
                      className={`hover:bg-gray-50 ${showSelectMode ? 'cursor-pointer' : 'cursor-pointer'}`}
                      onClick={() => showSelectMode ? handleSelectCompany(company) : handleViewCompany(company)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{company.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{company.domain || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Users className="h-4 w-4 mr-1 text-gray-400" />
                          {company.size || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {company.website ? (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe className="h-4 w-4 mr-1" />
                            Visit
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {showSelectMode ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectCompany(company);
                              }}
                              className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100"
                            >
                              Select
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewCompany(company);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCompany(company);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit Company"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(company.id);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Company"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstCompany + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(indexOfLastCompany, filteredCompanies.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredCompanies.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          currentPage === number
                            ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        }`}
                      >
                        {number}
                      </button>
                    ))}
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Company</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this company? This action cannot be undone.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => handleDeleteCompany(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-24 hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}