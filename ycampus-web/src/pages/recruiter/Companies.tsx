import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash, X, Building2, Users, Globe, MapPin, ExternalLink, Search, Filter } from "lucide-react";
import { jobService, Company } from "../../services/jobService";
import RoleSidebar from "../../components/common/RoleSidebar";
import RoleHeader from "../../components/common/RoleHeader";
import SearchBar from "../../components/common/SearchBar";
import { toast } from "sonner";

const RecruiterCompanies: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('all');

  const [companyFormData, setCompanyFormData] = useState({
    name: "",
    domain: "",
    website: "",
    size: "",
    description: "",
    benefits: "",
    location: "",
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await jobService.getAllCompanies();
      setCompanies(data);
    } catch (error) {
      console.error("Error fetching companies:", error);
      setCompanies([]);
    }
  };

  const openAddForm = () => {
    setIsEditing(false);
    setSelectedCompanyId(null);
    setCompanyFormData({
      name: "",
      domain: "",
      website: "",
      size: "",
      description: "",
      benefits: "",
      location: "",
    });
    setShowCompanyForm(true);
  };

  const openEditForm = (company: Company) => {
    setIsEditing(true);
    setSelectedCompanyId(company.id);
    setCompanyFormData({
      name: company.name,
      domain: company.domain || "",
      website: company.website || "",
      size: company.size || "",
      description: company.description || "",
      benefits: company.benefits || "",
      location: company.location || "",
    });
    setShowCompanyForm(true);
  };

  const handleSubmitCompany = async () => {
    if (!companyFormData.name.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    try {
      if (isEditing && selectedCompanyId) {
        await jobService.updateCompany(selectedCompanyId, companyFormData);
        toast.success('Company updated successfully');
      } else {
        await jobService.createCompany(companyFormData);
        toast.success('Company added successfully');
      }
      loadCompanies();
      setShowCompanyForm(false);
      setIsEditing(false);
      setSelectedCompanyId(null);
    } catch (err) {
      console.error("Error saving company:", err);
      toast.error(isEditing ? 'Failed to update company' : 'Failed to add company');
    }
  };

  const openDeleteModal = (id: string) => {
    setDeleteCompanyId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteCompany = async () => {
    if (!deleteCompanyId) return;
    try {
      setIsDeleting(true);
      await jobService.deleteCompany(deleteCompanyId);
      setCompanies(prev => prev.filter(company => company.id !== deleteCompanyId));
      setIsDeleteModalOpen(false);
      setDeleteCompanyId(null);
      toast.success('Company deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete company');
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteCompanyId(null);
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (company.domain && company.domain.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (company.location && company.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSize = selectedSizeFilter === 'all' || company.size === selectedSizeFilter;
    return matchesSearch && matchesSize;
  });

  const getDomainColor = (domain: string) => {
    const colors = {
      'technology': 'bg-blue-100 text-blue-700 border-blue-200',
      'tech': 'bg-blue-100 text-blue-700 border-blue-200',
      'healthcare': 'bg-green-100 text-green-700 border-green-200',
      'finance': 'bg-purple-100 text-purple-700 border-purple-200',
      'education': 'bg-orange-100 text-orange-700 border-orange-200',
      'retail': 'bg-pink-100 text-pink-700 border-pink-200',
      'manufacturing': 'bg-gray-100 text-gray-700 border-gray-200',
    };
    const key = domain?.toLowerCase() || '';
    return colors[key as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getSizeColor = (size: string) => {
    const colors = {
      '1-10': 'bg-green-100 text-green-700 border-green-200',
      '11-50': 'bg-blue-100 text-blue-700 border-blue-200',
      '51-200': 'bg-purple-100 text-purple-700 border-purple-200',
      '201-500': 'bg-orange-100 text-orange-700 border-orange-200',
      '501-1000': 'bg-red-100 text-red-700 border-red-200',
      '1000+': 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[size as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const headerActions = (
    <>
      <button
        onClick={() => navigate('/recruiter/jobs')}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <span>Back to Jobs</span>
      </button>
      <button
        onClick={openAddForm}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        <Plus className="h-4 w-4" />
        <span>Add Company</span>
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <RoleSidebar />

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <RoleHeader
            title="Company Management"
            subtitle="Manage your company database"
            actions={headerActions}
          />

          <div className="p-6">
            {/* Stats Cards and Search - Only show when form is not open */}
            {!showCompanyForm && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Total Companies</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold">{companies.length}</div>
                      <Building2 className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Small (1-50)</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold">{companies.filter(c => c.size === '1-10' || c.size === '11-50').length}</div>
                      <Users className="h-8 w-8 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Medium (51-500)</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold">{companies.filter(c => c.size === '51-200' || c.size === '201-500').length}</div>
                      <Building2 className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Large (500+)</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold">{companies.filter(c => c.size === '501-1000' || c.size === '1000+').length}</div>
                      <Globe className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div className="flex w-full items-center gap-4 h-12">
                    <div className="flex items-center border border-gray-200 rounded-lg bg-white px-4 gap-4 h-full">
                      <div className="flex gap-4">
                        <button
                          onClick={() => setSelectedSizeFilter('all')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${
                            selectedSizeFilter === 'all' ? 'bg-gray-200 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                          }`}
                        >
                          All Companies
                        </button>
                        <button
                          onClick={() => setSelectedSizeFilter('1-10')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${
                            selectedSizeFilter === '1-10' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                          }`}
                        >
                          Startup
                        </button>
                        <button
                          onClick={() => setSelectedSizeFilter('11-50')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${
                            selectedSizeFilter === '11-50' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                          }`}
                        >
                          Small
                        </button>
                        <button
                          onClick={() => setSelectedSizeFilter('51-200')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${
                            selectedSizeFilter === '51-200' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                          }`}
                        >
                          Medium
                        </button>
                        <button
                          onClick={() => setSelectedSizeFilter('501-1000')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${
                            selectedSizeFilter === '501-1000' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                          }`}
                        >
                          Large
                        </button>
                      </div>
                    </div>

                    <div className="group relative h-full flex items-center">
                      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} placeholder="Search companies..." />
                    </div>
                  </div>
                </div>

                {/* Company List */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Companies</h2>
                    <p className="text-sm text-gray-600">{filteredCompanies.length} company(ies) found</p>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {filteredCompanies.length === 0 ? (
                      <div className="text-center py-12">
                        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {searchQuery ? `No companies found matching "${searchQuery}"` : 'Get started by adding your first company.'}
                        </p>
                        {!searchQuery && (
                          <div className="mt-6">
                            <button
                              onClick={openAddForm}
                              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Company
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      filteredCompanies.map((company) => (
                        <div key={company.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="text-sm font-semibold text-gray-900 truncate">{company.name}</h3>
                                    {company.domain && (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getDomainColor(company.domain)}`}>
                                        {company.domain}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-4 mt-1">
                                    {company.size && (
                                      <div className="flex items-center text-xs text-gray-500">
                                        <Users className="h-3 w-3 mr-1" />
                                        <span className={`px-2 py-0.5 rounded border ${getSizeColor(company.size)}`}>
                                          {company.size} employees
                                        </span>
                                      </div>
                                    )}
                                    {company.location && (
                                      <div className="flex items-center text-xs text-gray-500">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {company.location}
                                      </div>
                                    )}
                                    {company.website && (
                                      <a
                                        href={company.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Website
                                      </a>
                                    )}
                                  </div>
                                  {company.description && (
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{company.description}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => openEditForm(company)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Company"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(company.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Company"
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Company Form */}
            {showCompanyForm && (
              <div className="mb-8 bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isEditing ? "Update Company" : "Add New Company"}
                  </h2>
                  <button
                    onClick={() => setShowCompanyForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="border border-gray-200 shadow-sm rounded-lg">
                    <div className="pb-4 p-6 border-b">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Building2 className="h-5 w-5 mr-2 text-blue-500" />
                        Basic Information
                      </h3>
                    </div>
                    <div className="space-y-4 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                          <input
                            type="text"
                            value={companyFormData.name}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                            placeholder="e.g., Tech Solutions Inc."
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
                          <input
                            type="text"
                            value={companyFormData.domain}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, domain: e.target.value })}
                            placeholder="e.g., Technology, Healthcare"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                          <input
                            type="url"
                            value={companyFormData.website}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, website: e.target.value })}
                            placeholder="https://company.com"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Company Size</label>
                          <select
                            value={companyFormData.size}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, size: e.target.value })}
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

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <input
                          type="text"
                          value={companyFormData.location}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, location: e.target.value })}
                          placeholder="e.g., San Francisco, CA"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={companyFormData.description}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, description: e.target.value })}
                          placeholder="Brief description about the company..."
                          rows={4}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
                        <textarea
                          value={companyFormData.benefits}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, benefits: e.target.value })}
                          placeholder="Employee benefits, perks, and advantages..."
                          rows={4}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowCompanyForm(false)}
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitCompany}
                      className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      {isEditing ? "Update Company" : "Add Company"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete Company</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this company? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCompany}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterCompanies;