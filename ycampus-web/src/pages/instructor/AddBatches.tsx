import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Users, Calendar as CalendarIcon, BookOpen, Eye, CheckCircle, XCircle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';


import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import SearchBar from '../../components/common/SearchBar';
import { toast } from 'sonner';
import { batchService, Batch, CreateBatchData, BatchStats } from '../../services/batchService';
import courseService, { Course } from '../../services/courseService';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  completed: 'bg-blue-100 text-blue-800',
  draft: 'bg-yellow-100 text-yellow-800',
};

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  completed: 'Completed',
  draft: 'Draft',
};

const Batches: React.FC = () => {
  const { user } = useAuth();
  
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'active' | 'draft' | 'all' | 'inactive' | 'completed' | 'students'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showBatchForm, setShowBatchForm] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [formData, setFormData] = useState<CreateBatchData>({
    name: '',
    title: '',
    description: '',
    course: '',
    start_date: '',
    end_date: '',
    max_students: 50,
    status: 'draft',
  });

  const hasAccess = user?.role === 'admin' || user?.role === 'instructor';

  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course?.name || 'Unknown Course';
  };

  const getCourseShortCode = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course?.short_code || '';
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader 
              title="Batch Management" 
              subtitle="Manage student batches and enrollments"
            />
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-red-600 mb-4">
                  <XCircle className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">Access Denied</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Only administrators can access batch management.
                  </p>
                </div>
                <button
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const loadInitialData = async () => {
    if (!hasAccess) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadBatches(),
        loadCourses()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [hasAccess]);

  // Debug form data changes
  useEffect(() => {
    console.log('Form data changed:', formData);
  }, [formData]);

  const loadBatches = async () => {
    try {
      console.log('Loading batches...');
      const [batchesData, statsData] = await Promise.all([
        batchService.fetchBatches(),
        batchService.getBatchStats()
      ]);
      console.log('Loaded batches:', batchesData);
      console.log('Loaded stats:', statsData);
      setBatches(batchesData);
      setBatchStats(statsData);
    } catch (error) {
      console.error('Error loading batches:', error);
      toast.error('Failed to load batches');
    }
  };

  const loadCourses = async () => {
    try {
      const coursesData = await courseService.fetchCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const filteredBatches = batches.filter(batch => {
    let matchesTab = false;
    
    if (selectedTab === 'all') {
      matchesTab = true;
    } else if (selectedTab === 'students') {
      // Show all batches with students enrolled
      matchesTab = batch.enrolled_count > 0;
    } else if (selectedTab === 'inactive') {
      matchesTab = batch.status === 'inactive';
    } else if (selectedTab === 'completed') {
      matchesTab = batch.status === 'completed';
    } else {
      // active or draft
      matchesTab = batch.status === selectedTab;
    }
    
    const matchesSearch = !searchQuery || 
      batch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCourseName(batch.course).toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  const batchCounts = batches.reduce((acc: any, batch) => {
    acc[batch.status] = (acc[batch.status] || 0) + 1;
    // Count batches with students for the "students" filter
    if (batch.enrolled_count > 0) {
      acc.students = (acc.students || 0) + 1;
    }
    return acc;
  }, {});
  
  // Calculate total enrolled students
  const totalEnrolledStudents = batches.reduce((sum, batch) => sum + batch.enrolled_count, 0);

  const handleTabChange = (tab: typeof selectedTab) => {
    setSelectedTab(tab);
    setSearchQuery('');
  };

  const handleCreateBatch = async () => {
    console.log('Creating batch with form data:', formData); 
    
    const errors = [];
    if (!formData.name.trim()) errors.push('Batch name is required');
    if (!formData.title.trim()) errors.push('Batch title is required');
    if (!formData.course) errors.push('Course selection is required');
    if (!formData.start_date) errors.push('Start date is required');
    if (formData.end_date && formData.start_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      errors.push('End date must be after start date');
    }
    if (formData.max_students < 1) errors.push('Max students must be at least 1');

    if (errors.length > 0) {
      toast.error(errors.join(', '));
      return;
    }

    try {
      setSaving(true);
      
      const batchData = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : '',
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
      };
      
      console.log('Sending batch data to API:', batchData); 
      
      await batchService.createBatch(batchData);
      toast.success('Batch created successfully');
      
      setShowBatchForm(false);
      resetForm();
      await loadBatches(); 
    } catch (error: any) {
      console.error('Error creating batch:', error);
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.data?.message || 
                          error?.message || 
                          'Failed to create batch';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBatch = async () => {
    console.log('Updating batch with form data:', formData);
    
    const errors = [];
    if (!formData.name.trim()) errors.push('Batch name is required');
    if (!formData.title.trim()) errors.push('Batch title is required');
    if (!formData.course) errors.push('Course selection is required');
    if (!formData.start_date) errors.push('Start date is required');
    if (formData.end_date && formData.start_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      errors.push('End date must be after start date');
    }
    if (formData.max_students < 1) errors.push('Max students must be at least 1');

    if (errors.length > 0) {
      toast.error(errors.join(', '));
      return;
    }

    if (!selectedBatch) {
      toast.error('No batch selected for update');
      return;
    }

    try {
      setSaving(true);
      
      const batchData = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : '',
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
      };
      
      console.log('Sending batch data to API:', batchData);
      
      const updatedBatch = await batchService.updateBatch(selectedBatch.id, batchData);
      console.log('Batch updated successfully:', updatedBatch);
      
      toast.success('Batch updated successfully');
      
      setIsEditOpen(false);
      setSelectedBatch(null);
      resetForm();
      await loadBatches(); 
    } catch (error: any) {
      console.error('Error updating batch:', error);
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.data?.message || 
                          error?.message || 
                          'Failed to update batch';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!confirmDelete) return;

    try {
      setDeleting(true);
      await batchService.deleteBatch(confirmDelete);
      toast.success('Batch deleted successfully');
      
      setConfirmDelete(null);
      await loadBatches(); 
    } catch (error: any) {
      console.error('Error deleting batch:', error);
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.data?.message || 
                          error?.message || 
                          'Failed to delete batch';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleViewBatch = async (batch: Batch) => {
    try {
      const detailedBatch = await batchService.fetchBatchById(batch.id);
      setSelectedBatch(detailedBatch);
      setIsViewOpen(true);
    } catch (error: any) {
      console.error('Error loading batch details:', error);
      toast.error('Failed to load batch details');
    }
  };

  const handleEditBatch = (batch: Batch) => {
    console.log('=== Edit Batch Started ===');
    console.log('Batch data:', batch);
    console.log('  - Course ID:', batch.course, 'Type:', typeof batch.course);
    console.log('  - Status:', batch.status, 'Type:', typeof batch.status);
    
    // Validate course ID exists in courses list
    const courseExists = courses.some(c => String(c.id) === String(batch.course));
    console.log('  - Course exists in list:', courseExists);
    if (!courseExists) {
      console.warn('Warning: Selected course not found in courses list');
    }
    
    // Validate status is valid
    const validStatuses = ['active', 'inactive', 'completed', 'draft'];
    const statusValid = validStatuses.includes(batch.status);
    console.log('  - Status valid:', statusValid);
    
    const newFormData: CreateBatchData = {
      name: batch.name,
      title: batch.title,
      description: batch.description || '',
      course: String(batch.course), // Ensure it's a string for Select component
      start_date: batch.start_date ? new Date(batch.start_date).toISOString().split('T')[0] : '',
      end_date: batch.end_date ? new Date(batch.end_date).toISOString().split('T')[0] : '',
      max_students: batch.max_students,
      status: batch.status as 'active' | 'inactive' | 'completed' | 'draft',
    };
    
    console.log('Form data to set:', newFormData);
    console.log('  - Course (string):', newFormData.course, 'Type:', typeof newFormData.course);
    console.log('  - Status (string):', newFormData.status, 'Type:', typeof newFormData.status);
    
    // Update state in correct order: batch first, then form data, then dialog
    setSelectedBatch(batch);
    setFormData(newFormData);
    // Ensure dialog opens after state updates
    setTimeout(() => {
      setIsEditOpen(true);
    }, 0);
    
    console.log('=== Edit Batch Dialog Should Open ===');
  };

  const resetForm = () => {
    console.log('Resetting form'); 
    setFormData({
      name: '',
      title: '',
      description: '',
      course: '',
      start_date: '',
      end_date: '',
      max_students: 50,
      status: 'draft',
    });
  };

  const headerActions = (
    <Button
      onClick={() => {
        setShowBatchForm(true);
      }}
      className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
    >
      <Plus className="h-4 w-4 mr-2" />
      Add New Batch
    </Button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        
        <div className="flex-1">
          <RoleHeader
            title="Batch Management"
            subtitle="Create and manage student batches for courses"
            actions={headerActions}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {showBatchForm && (
              <div className="mb-8 bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Create New Batch
                  </h2>
                  <button
                    onClick={() => {
                      setShowBatchForm(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Batch Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g., Batch A - Jan 2024"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={!formData.name.trim() ? 'border-black-300 focus:border-black-500' : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Batch Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g., Python Fundamentals Batch"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className={!formData.title.trim() ? 'border-black-300 focus:border-black-500' : ''}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Description</Label>
                    <Textarea
                      placeholder="Optional description for the batch"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Select Course <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={formData.course || ""}
                            onValueChange={(value) => {
                              console.log('Create: Course changed to:', value);
                              setFormData({ ...formData, course: value });
                            }}
                          >
                            <SelectTrigger className="w-full cursor-pointer">
                              <SelectValue placeholder="Select Course...">
                                {formData.course ? (
                                  courses.find(c => String(c.id) === formData.course) ? (
                                    (() => {
                                      const selected = courses.find(c => String(c.id) === formData.course);
                                      return selected?.short_code ? `${selected.short_code}: ${selected.name}` : selected?.name;
                                    })()
                                  ) : (
                                    formData.course
                                  )
                                ) : null}
                              </SelectValue>
                            </SelectTrigger>
                            
                            <SelectContent className="bg-white border shadow-md z-[50] max-h-[300px]">
                              {courses.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  No courses available
                                </div>
                              ) : (
                                courses.map((course) => (
                                  <SelectItem 
                                    key={course.id} 
                                    value={String(course.id)}
                                    className="cursor-pointer"
                                  >
                                    {course.short_code ? (
                                      `${course.short_code}: ${course.name}`
                                    ) : (
                                      course.name
                                    )}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>



                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Start Date</Label>

                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>                  
                </div>


                

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Max Students</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.max_students}
                        onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 50 })}
                      />
                    </div>


                    
                




                    <div className="space-y-2">
  <Label className="text-sm font-medium">Status</Label>
  <Select
    value={formData.status || "draft"}
    onValueChange={(value: 'draft' | 'active' | 'inactive' | 'completed') => {
      console.log('Create: Status changed to:', value);
      setFormData({ ...formData, status: value });
    }}
  >
    <SelectTrigger className="w-full bg-white cursor-pointer">
      <SelectValue placeholder="Select status">
        {formData.status ? STATUS_LABELS[formData.status] : null}
      </SelectValue>
    </SelectTrigger>
    
    <SelectContent className="bg-white border border-slate-200 shadow-lg z-[100]">
      <SelectItem value="draft" className="cursor-pointer">Draft</SelectItem>
      <SelectItem value="active" className="cursor-pointer">Active</SelectItem>
      <SelectItem value="inactive" className="cursor-pointer">Inactive</SelectItem>
      <SelectItem value="completed" className="cursor-pointer">Completed</SelectItem>
    </SelectContent>
  </Select>
</div>
                  </div>

                  <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBatchForm(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                    disabled={
                      saving ||
                      !formData.name.trim() ||
                      !formData.title.trim() ||
                      !formData.course ||
                      !formData.start_date
                    }
                    onClick={handleCreateBatch}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Creating...
                      </div>
                    ) : (
                      <span>Submit</span>
                    )}
                  </Button>

                    
                  </div>
                </div>
              </div>
            )}

            {!showBatchForm && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div 
                    onClick={() => { setSelectedTab('all'); setSearchQuery(''); }}
                    className={`bg-white border rounded-lg p-6 cursor-pointer transition-all ${
                      selectedTab === 'all' 
                        ? 'border-blue-500 shadow-lg ring-2 ring-blue-500' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Total Batches</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-blue-600">{batchStats?.total_batches || 0}</div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>

                  <div 
                    onClick={() => { setSelectedTab('active'); setSearchQuery(''); }}
                    className={`bg-white border rounded-lg p-6 cursor-pointer transition-all ${
                      selectedTab === 'active' 
                        ? 'border-green-500 shadow-lg ring-2 ring-green-500' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Active Batches</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-green-600">{batchStats?.active_batches || 0}</div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>

                  <div 
                    onClick={() => { setSelectedTab('inactive'); setSearchQuery(''); }}
                    className={`bg-white border rounded-lg p-6 cursor-pointer transition-all ${
                      selectedTab === 'inactive' 
                        ? 'border-red-500 shadow-lg ring-2 ring-red-500' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Inactive Batches</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-red-600">{batchCounts.inactive || 0}</div>
                      <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                  </div>

                  <div 
                    onClick={() => { setSelectedTab('completed'); setSearchQuery(''); }}
                    className={`bg-white border rounded-lg p-6 cursor-pointer transition-all ${
                      selectedTab === 'completed' 
                        ? 'border-purple-500 shadow-lg ring-2 ring-purple-500' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Completed Batches</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-purple-600">{batchCounts.completed || 0}</div>
                      <CheckCircle className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                </div>

            <div className="mb-6 space-y-4">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                placeholder="Search batches by name, title, or course..."
              />

              <nav className="flex space-x-8 overflow-x-auto pb-2">
                {[
                  { key: 'active', label: 'Active', count: batchCounts.active || 0 },
                  { key: 'draft', label: 'Draft', count: batchCounts.draft || 0 },
                  { key: 'inactive', label: 'Inactive', count: batchCounts.inactive || 0 },
                  { key: 'completed', label: 'Completed', count: batchCounts.completed || 0 },
                  { key: 'all', label: 'All Batches', count: batches.length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      selectedTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`rounded-full px-2 py-1 text-xs ${
                      selectedTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading batches...</span>
              </div>
            )}

            {!loading && filteredBatches.length === 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No batches found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery ? 'No batches match your search criteria.' : 'Get started by creating your first batch.'}
                  </p>
                  {!searchQuery && (
                    <div className="mt-6">
                      <Button
                        onClick={() => setShowBatchForm(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Batch
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!loading && filteredBatches.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Batch Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Course
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Enrollment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Schedule
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBatches.map((batch) => (
                        <tr key={batch.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{batch.title}</div>
                              <div className="text-sm text-gray-500">{batch.name}</div>
                              {batch.description && (
                                <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                                  {batch.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <BookOpen className="h-4 w-4 mr-2 text-gray-400" />
                              <div>
                                <div className="font-medium">{getCourseName(batch.course)}</div>
                                <div className="text-xs text-gray-500">
                                  {getCourseShortCode(batch.course)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{batch.enrolled_count}/{batch.max_students}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {Math.round((batch.enrolled_count / batch.max_students) * 100)}% capacity
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                              <div>
                                <div>{new Date(batch.start_date).toLocaleDateString()}</div>
                                {batch.end_date && (
                                  <div className="text-xs text-gray-500">
                                    to {new Date(batch.end_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[batch.status]}`}>
                              {STATUS_LABELS[batch.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewBatch(batch)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEditBatch(batch)}
                                disabled={saving || deleting}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Edit Batch"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(batch.id)}
                                disabled={saving || deleting}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete Batch"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
              </>
            )}
          </div>

          <Dialog open={isEditOpen} onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) {
              setSelectedBatch(null);
              resetForm();
            }
          }}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 -mx-6 -mt-6 mb-6">
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Edit className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-white">
                        Edit Batch
                      </DialogTitle>
                      <p className="text-blue-100 text-sm mt-1">
                        Update batch information and settings
                      </p>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Batch Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Batch Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Select Course <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.course || ""}
                    onValueChange={(value) => {
                      console.log('Edit: Course changed to:', value, 'Previous:', formData.course);
                      setFormData({ ...formData, course: value });
                    }}
                  >
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Select Course...">
                        {formData.course ? (
                          courses.find(c => String(c.id) === formData.course) ? (
                            (() => {
                              const selected = courses.find(c => String(c.id) === formData.course);
                              return selected?.short_code ? `${selected.short_code}: ${selected.name}` : selected?.name;
                            })()
                          ) : (
                            formData.course
                          )
                        ) : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-md z-[50] max-h-[300px]">
                      {courses.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No courses available
                        </div>
                      ) : (
                        courses.map((course) => (
                          <SelectItem 
                            key={course.id} 
                            value={String(course.id)}
                            className="cursor-pointer"
                          >
                            {course.short_code ? (
                              `${course.short_code}: ${course.name}`
                            ) : (
                              course.name
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Start Date</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Max Students</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.max_students}
                      onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 50 })}
                    />
                  </div>



                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={formData.status || "draft"}
                      onValueChange={(value: 'draft' | 'active' | 'inactive' | 'completed') => {
                        console.log('Edit: Status changed to:', value, 'Previous:', formData.status);
                        setFormData({ ...formData, status: value });
                      }}
                    >
                      <SelectTrigger className="w-full bg-white cursor-pointer">
                        <SelectValue placeholder="Select status">
                          {formData.status ? STATUS_LABELS[formData.status] : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-200 shadow-lg z-[100]">
                        <SelectItem value="draft" className="cursor-pointer">Draft</SelectItem>
                        <SelectItem value="active" className="cursor-pointer">Active</SelectItem>
                        <SelectItem value="inactive" className="cursor-pointer">Inactive</SelectItem>
                        <SelectItem value="completed" className="cursor-pointer">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

             

              

              <DialogFooter className="gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelectedBatch(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={saving || !formData.name.trim() || !formData.title.trim() || !formData.course || !formData.start_date}
                  onClick={handleUpdateBatch}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Save Changes
                    </div>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View Batch Details Modal */}
          <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              {selectedBatch && (
                <>
                  <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 -mx-6 -mt-6 mb-6">
                    <DialogHeader>
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                          <Eye className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <DialogTitle className="text-xl font-semibold text-white">
                            {selectedBatch.title}
                          </DialogTitle>
                          <p className="text-green-100 text-sm mt-1">
                            {selectedBatch.name}
                          </p>
                        </div>
                      </div>
                    </DialogHeader>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Course</h4>
                        <p className="text-gray-600">{getCourseName(selectedBatch.course)}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedBatch.status]}`}>
                          {STATUS_LABELS[selectedBatch.status]}
                        </span>
                      </div>
                    </div>

                    {selectedBatch.description && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                        <p className="text-gray-600">{selectedBatch.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {selectedBatch.enrolled_count}
                        </div>
                        <div className="text-sm text-gray-500">Enrolled Students</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {selectedBatch.max_students}
                        </div>
                        <div className="text-sm text-gray-500">Max Capacity</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {Math.round((selectedBatch.enrolled_count / selectedBatch.max_students) * 100)}%
                        </div>
                        <div className="text-sm text-gray-500">Capacity Used</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Start Date</h4>
                        <p className="text-gray-600">
                          {new Date(selectedBatch.start_date).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedBatch.end_date && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">End Date</h4>
                          <p className="text-gray-600">
                            {new Date(selectedBatch.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedBatch.batch_students && selectedBatch.batch_students.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Enrolled Students</h4>
                        <div className="max-h-40 overflow-y-auto border rounded-lg">
                          {selectedBatch.batch_students.map((batchStudent) => (
                            <div key={batchStudent.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {batchStudent.student.first_name} {batchStudent.student.last_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {batchStudent.student.email}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  {Math.round(batchStudent.progress_percentage)}% Progress
                                </div>
                                <div className="text-xs text-gray-500">
                                  Enrolled {new Date(batchStudent.enrolled_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        setIsViewOpen(false);
                        handleEditBatch(selectedBatch);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Batch
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
            <DialogContent className="sm:max-w-[450px]">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 -mx-6 -mt-6 mb-6">
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Trash2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-white">
                        Delete Batch
                      </DialogTitle>
                      <p className="text-red-100 text-sm mt-1">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-red-50 p-3 rounded-full">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Are you absolutely sure?
                    </h3>
                    <p className="text-gray-600 mb-3">
                      This will permanently delete the batch and all associated data including:
                    </p>
                    <ul className="text-sm text-gray-500 space-y-1">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                        Student enrollment records
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                        Progress tracking data
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                        Batch configuration settings
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-3 mt-6">
                <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleting}
                  onClick={handleDeleteBatch}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Deleting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete Batch
                    </div>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Batches;