import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash, X, Building2, Users, Globe, MapPin, ExternalLink, Search, Filter } from "lucide-react";
import { jobService, Company } from "../../services/jobService";
import RoleSidebar from "../../components/common/RoleSidebar";
import RoleHeader from "../../components/common/RoleHeader";
import SearchBar from "../../components/common/SearchBar";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../components/ui/dialog";
import { StatsCard } from "../../components/common/StatsCard";
import { DataTable } from "../../components/common/DataTable";

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
  const [nameError, setNameError] = useState<string | null>(null);
  const [isValidatingName, setIsValidatingName] = useState(false);

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

  useEffect(() => {
    if (!companyFormData.name.trim()) {
      setNameError(null);
      setIsValidatingName(false);
      return;
    }

    setIsValidatingName(true);
    const timeoutId = setTimeout(async () => {
      try {
        const result = await jobService.checkCompanyName(
          companyFormData.name.trim(),
          isEditing && selectedCompanyId ? selectedCompanyId : undefined
        );
        if (result.exists) {
          setNameError("A company with this name is already registered.");
        } else {
          setNameError(null);
        }
      } catch (error) {
        console.error("Error checking company name:", error);
      } finally {
        setIsValidatingName(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [companyFormData.name, isEditing, selectedCompanyId]);

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
    setNameError(null);
    setIsValidatingName(false);
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
    setNameError(null);
    setIsValidatingName(false);
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
    if (nameError) {
      toast.error('Please fix the errors before submitting');
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
      <Button
        variant="outline"
        onClick={() => navigate('/recruiter/jobs')}
        className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm transition-all duration-200"
      >
        <span>Back to Jobs</span>
      </Button>
      <Button
        onClick={openAddForm}
        className="flex items-center space-x-2 bg-blue-500 text-white hover:bg-blue-600 shadow-sm transition-all duration-200"
      >
        <Plus className="h-4 w-4" />
        <span>Add Company</span>
      </Button>
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

          <div className="px-6 py-6">
            {/* Stats Cards and Search - Only show when form is not open */}
            {!showCompanyForm && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <StatsCard
                    label="Total Companies"
                    value={companies.length}
                    icon={Building2}
                    colorScheme="blue"
                    size="md"
                  />
                  <StatsCard
                    label="Small (1-50)"
                    value={companies.filter(c => c.size === '1-10' || c.size === '11-50').length}
                    icon={Users}
                    colorScheme="green"
                    size="md"
                  />
                  <StatsCard
                    label="Medium (51-500)"
                    value={companies.filter(c => c.size === '51-200' || c.size === '201-500').length}
                    icon={Building2}
                    colorScheme="blue"
                    size="md"
                  />
                  <StatsCard
                    label="Large (500+)"
                    value={companies.filter(c => c.size === '501-1000' || c.size === '1000+').length}
                    icon={Globe}
                    colorScheme="purple"
                    size="md"
                  />
                </div>

                <div className="mb-6 flex items-center justify-between gap-4">
                  <div className="flex w-full items-center gap-4 h-12">
                    <Tabs value={selectedSizeFilter} onValueChange={setSelectedSizeFilter}>
                      <TabsList className="inline-flex w-auto gap-1">
                        <TabsTrigger value="all" className="px-5">All Companies</TabsTrigger>
                        <TabsTrigger value="1-10" className="px-5">Startup</TabsTrigger>
                        <TabsTrigger value="11-50" className="px-5">Small</TabsTrigger>
                        <TabsTrigger value="51-200" className="px-5">Medium</TabsTrigger>
                        <TabsTrigger value="501-1000" className="px-5">Large</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="group relative h-full flex items-center flex-1">
                      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} placeholder="Search companies..." />
                    </div>
                  </div>
                </div>

                <DataTable
                  title="Companies"
                  description={`${filteredCompanies.length} company(ies) found`}
                  data={filteredCompanies}
                  columns={[
                    {
                      header: 'Company Name',
                      cell: (company) => (
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{company.name}</div>
                            {company.domain && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border mt-1 ${getDomainColor(company.domain)}`}>
                                {company.domain}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    },
                    {
                      header: 'Size',
                      cell: (company) => (
                        <div className="flex items-center text-sm text-gray-900">
                          <Users className="h-4 w-4 mr-2 text-gray-400" />
                          <span className={`${company.size ? `px-2 py-0.5 rounded text-xs border ${getSizeColor(company.size)}` : ''}`}>
                            {company.size || 'N/A'}
                          </span>
                        </div>
                      )
                    },
                    {
                      header: 'Location',
                      cell: (company) => (
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          {company.location || 'N/A'}
                        </div>
                      )
                    },
                    {
                      header: 'Website',
                      cell: (company) => (
                        company.website ? (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Visit
                          </a>
                        ) : <span className="text-gray-400 text-sm">N/A</span>
                      )
                    },
                    {
                      header: 'Actions',
                      cell: (company) => (
                        <div className="flex items-center justify-end gap-2">
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
                      ),
                      className: 'text-right'
                    }
                  ]}
                  keyExtractor={(item) => item.id}
                  emptyState={{
                    message: "No companies found",
                    subMessage: searchQuery ? `No companies found matching "${searchQuery}"` : "Get started by adding your first company",
                    action: !searchQuery ? (
                      <Button
                        onClick={openAddForm}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Company
                      </Button>
                    ) : undefined
                  }}
                />
              </>
            )}

            {/* Company Form */}
            {showCompanyForm && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isEditing ? "Update Company" : "Add New Company"}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCompanyForm(false)}
                    className="rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <Building2 className="h-5 w-5 mr-2 text-blue-500" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className={nameError ? "text-red-500" : ""}>Company Name *</Label>
                          <Input
                            value={companyFormData.name}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                            placeholder="e.g., Tech Solutions Inc."
                            className={`bg-white ${nameError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          />
                          {nameError && (
                            <p className="text-sm text-red-500 mt-1">{nameError}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Domain</Label>
                          <Input
                            value={companyFormData.domain}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, domain: e.target.value })}
                            placeholder="e.g., Technology, Healthcare"
                            className="bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Website</Label>
                          <Input
                            type="url"
                            value={companyFormData.website}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, website: e.target.value })}
                            placeholder="https://company.com"
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Company Size</Label>
                          <Select
                            value={companyFormData.size}
                            onValueChange={(value) => setCompanyFormData({ ...companyFormData, size: value })}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select Size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1-10">1-10 employees</SelectItem>
                              <SelectItem value="11-50">11-50 employees</SelectItem>
                              <SelectItem value="51-200">51-200 employees</SelectItem>
                              <SelectItem value="201-500">201-500 employees</SelectItem>
                              <SelectItem value="501-1000">501-1000 employees</SelectItem>
                              <SelectItem value="1000+">1000+ employees</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input
                          value={companyFormData.location}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, location: e.target.value })}
                          placeholder="e.g., San Francisco, CA"
                          className="bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={companyFormData.description}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, description: e.target.value })}
                          placeholder="Brief description about the company..."
                          rows={4}
                          className="bg-white resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Benefits</Label>
                        <Textarea
                          value={companyFormData.benefits}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, benefits: e.target.value })}
                          placeholder="Employee benefits, perks, and advantages..."
                          rows={4}
                          className="bg-white resize-none"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="ghost"
                      onClick={() => setShowCompanyForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitCompany}
                      disabled={isValidatingName || !!nameError}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isValidatingName ? "Validating..." : (isEditing ? "Update Company" : "Add Company")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this company? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDeleteModal}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCompany}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default RecruiterCompanies;