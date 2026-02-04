import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, BookOpen, Users } from "lucide-react";

import {
  fetchCourses,
  createCourse,
  deleteCourse,
  updateCourse,
  fetchAllInstructors,
  fetchCourseInstructors,
  addInstructorToCourse,
  removeInstructorFromCourse,
} from "@/services/courseService";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import RoleSidebar from "../../components/common/RoleSidebar";
import RoleHeader from "../../components/common/RoleHeader";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/multi-select";

type Course = {
  id: string;
  short_code: string | null;
  name: string;
  category: "fundamentals" | "programming_languages" | "databases" | "ai_tools";
};

type Instructor = {
  id: string;
  username: string;
  email: string;
};

const CATEGORY_LABELS: Record<Course["category"], string> = {
  fundamentals: "Fundamentals",
  programming_languages: "Programming Languages",
  databases: "Databases",
  ai_tools: "AI Tools",
};

const CATEGORY_GRADIENTS: Record<Course["category"], string> = {
  fundamentals: "from-blue-900 to-blue-700",
  programming_languages: "from-purple-900 to-purple-700",
  databases: "from-green-900 to-green-700",
  ai_tools: "from-orange-900 to-orange-700",
};

const Courses: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Course["category"]>('fundamentals');

  // Add Course Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: "",
    short_code: "",
    category: "",
  });
  const [saving, setSaving] = useState(false);

  // Delete Confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit Course Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCourseId, setEditCourseId] = useState<string | null>(null);

  // Instructor-related state
  const [availableInstructors, setAvailableInstructors] = useState<Instructor[]>([]);
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]); // for Add
  const [editSelectedInstructors, setEditSelectedInstructors] = useState<string[]>([]); // for Edit
  const [editInitialInstructors, setEditInitialInstructors] = useState<string[]>([]); // to compute diff

  // --------------------------------------------------
  // Load Courses
  // --------------------------------------------------
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await fetchCourses();

      if (user?.role === "instructor") {
        // Filter only assigned courses
        const myCourses = [];

        for (const c of data) {
          const instructors = await fetchCourseInstructors(c.id);
          const isAssigned = instructors.some(
            (ci: any) => ci.id === user.id
          );

          if (isAssigned) myCourses.push(c);
        }

        setCourses(myCourses);
      } else {
        // Admin sees everything
        setCourses(data);
      }

    } catch (err) {
      console.error("Failed to load courses", err);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };


  // --------------------------------------------------
  // Load Instructors (once)
  // --------------------------------------------------
  const loadInstructors = async () => {
    try {
      if (availableInstructors.length === 0) {
        const data = await fetchAllInstructors();
        setAvailableInstructors(data);
      }
    } catch (err) {
      console.error("Failed to load instructors", err);
      toast.error("Failed to load instructors");
    }
  };

  // Load instructors when Add modal opens
  useEffect(() => {
    if (isAddOpen) {
      loadInstructors();
    }
  }, [isAddOpen]);

  // --------------------------------------------------
  // Filter Courses by Active Tab
  // --------------------------------------------------
  const filteredCourses = courses.filter(course => course.category === activeTab);

  // Handle tab change
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  // Get course counts by category
  const courseCounts = courses.reduce((acc: any, course) => {
    acc[course.category] = (acc[course.category] || 0) + 1;
    return acc;
  }, {});

  // --------------------------------------------------
  // DELETE COURSE
  // --------------------------------------------------
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);

    try {
      await deleteCourse(confirmDelete);

      toast.success("Course deleted successfully");
      setConfirmDelete(null);
      loadCourses();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete course");
    } finally {
      setDeleting(false);
    }
  };

  // --------------------------------------------------
  // CREATE COURSE (with instructors)
  // --------------------------------------------------
  const handleCreateCourse = async () => {
    if (!newCourse.name.trim()) {
      toast.error("Course name is required");
      return;
    }

    if (!newCourse.category) {
      toast.error("Please select a category");
      return;
    }

    try {
      setSaving(true);

      // 1) Create the course
      const created = await createCourse(newCourse);

      // 2) Assign selected instructors
      if (selectedInstructors.length > 0) {
        for (const instructorId of selectedInstructors) {
          try {
            await addInstructorToCourse(created.id, instructorId);
          } catch (e) {
            console.error("Failed to assign instructor", e);
          }
        }
      }

      toast.success("Course created successfully");

      // Reset
      setNewCourse({ name: "", short_code: "", category: "" });
      setSelectedInstructors([]);
      setIsAddOpen(false);

      loadCourses();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // OPEN EDIT MODAL (load instructors for course)
  // --------------------------------------------------
  const openEditCourseModal = async (course: Course) => {
    setEditCourseId(course.id);
    setNewCourse({
      name: course.name,
      short_code: course.short_code || "",
      category: course.category,
    });
    setIsEditOpen(true);

    try {
      // Ensure we have all available instructors
      await loadInstructors();

      // Fetch instructors for this course
      const mappings = await fetchCourseInstructors(course.id);
      console.log("Course instructors response:", mappings);  // 🔥 ADD THIS

      // mappings: [{ id, instructor: {...}, created_at }]
      const instructorIds = mappings.map((m: any) => m.id) as string[];

      setEditSelectedInstructors(instructorIds);
      setEditInitialInstructors(instructorIds);
    } catch (err) {
      console.error("Failed to  load course instructors", err);
      toast.error("Failed to load course instructors");
    }
  };

  // --------------------------------------------------
  // UPDATE COURSE (with instructor add/remove)
  // --------------------------------------------------
  const handleUpdateCourse = async () => {
    if (!editCourseId) return;

    try {
      setSaving(true);

      // 1) Update the course basic info
      await updateCourse(editCourseId, newCourse);

      // 2) Compute instructor changes
      const toAdd = editSelectedInstructors.filter(
        (id) => !editInitialInstructors.includes(id)
      );
      const toRemove = editInitialInstructors.filter(
        (id) => !editSelectedInstructors.includes(id)
      );

      // 3) Apply additions
      for (const id of toAdd) {
        try {
          await addInstructorToCourse(editCourseId, id);
        } catch (e) {
          console.error("Failed to add instructor", e);
        }
      }

      // 4) Apply removals
      for (const id of toRemove) {
        try {
          await removeInstructorFromCourse(editCourseId, id);
        } catch (e) {
          console.error("Failed to remove instructor", e);
        }
      }

      toast.success("Course updated successfully");

      setIsEditOpen(false);
      setEditCourseId(null);
      setEditSelectedInstructors([]);
      setEditInitialInstructors([]);

      loadCourses();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  const headerActions = (
    <button
      onClick={() => setIsAddOpen(true)}
      className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
    >
      + Add New Course
    </button>
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
            title="Course Management"
            subtitle={user?.role === "admin"
              ? "Create, edit, and manage all courses in the system"
              : "Manage your assigned courses and content"
            }
            actions={headerActions}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Tabs */}
            <div className="mb-6">
              <nav className="flex space-x-8">
                {[
                  { key: 'fundamentals', label: 'Fundamentals', count: courseCounts.fundamentals || 0 },
                  { key: 'programming_languages', label: 'Programming Languages', count: courseCounts.programming_languages || 0 },
                  { key: 'databases', label: 'Databases', count: courseCounts.databases || 0 },
                  { key: 'ai_tools', label: 'AI Tools', count: courseCounts.ai_tools || 0 }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`rounded-full px-2 py-1 text-xs ${activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading courses...</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredCourses.length === 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {`No ${CATEGORY_LABELS[activeTab]} courses found.`}
                  </p>
                </div>
              </div>
            )}

            {/* Courses Grid */}
            {!loading && filteredCourses.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCourses.map((course: Course) => (
                  <Card
                    key={course.id}
                    className="group relative overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-200 hover:border-gray-300 bg-white rounded-xl"
                  >
                    <CardContent className="p-0">
                      {/* Course Header with gradient */}
                      <div className={`bg-gradient-to-r ${CATEGORY_GRADIENTS[course.category]} p-4 text-white relative overflow-hidden`}>
                        {/* Subtle pattern overlay */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute inset-0" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                          }} />
                        </div>

                        <div className="flex items-start justify-between relative z-10">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="h-4 w-4 text-white/70" />
                              <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                                {CATEGORY_LABELS[course.category]}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg leading-tight mb-2 text-white">
                              {course.name}
                            </h3>
                          </div>

                          {course.short_code && (
                            <div className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/30">
                              <span className="text-xs font-bold text-white">
                                {course.short_code}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Course Content */}
                      <div className="p-5">
                        {/* Stats section */}
                        <div className="flex items-center gap-6 text-sm text-gray-500 mb-5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                            <span className="font-medium">Active</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            <span>Multi-instructor</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between">
                          {/* Manage Button - Left Side */}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/instructor/courses/${course.id}/manage`)}
                            className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                          >
                            Manage
                          </Button>

                          {/* Edit/Delete Icons - Right Side */}
                          {user?.role === "admin" && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditCourseModal(course)}
                                className="h-9 w-9 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-110"
                                title="Edit course"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDelete(course.id)}
                                className="h-9 w-9 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                                title="Delete course"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hover Effect Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* ---------------- Add Course Modal ---------------- */}
          <Dialog
            open={isAddOpen}
            onOpenChange={(open) => {
              setIsAddOpen(open);
              if (!open) {
                setNewCourse({ name: "", short_code: "", category: "" });
                setSelectedInstructors([]);
              }
            }}
          >
            <DialogContent className="sm:max-w-[500px] p-0 max-h-[90vh] overflow-y-auto">
              {/* Header with gradient background */}
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4">
                <DialogHeader className="space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-white">
                        Create New Course
                      </DialogTitle>
                      <p className="text-amber-100 text-sm mt-1">
                        Add a new course to your curriculum
                      </p>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {/* Form Content */}
              <div className="px-6 py-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Course Name
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g., Introduction to Python Programming"
                    value={newCourse.name}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, name: e.target.value })
                    }
                    className="h-11 border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">#</span>
                    Short Code
                    <span className="text-xs text-gray-500">(optional)</span>
                  </Label>
                  <Input
                    placeholder="e.g., PY101, JS-BASICS"
                    value={newCourse.short_code}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, short_code: e.target.value })
                    }
                    className="h-11 border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                  />
                  <p className="text-xs text-gray-500">
                    A short identifier for easy reference
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <div className="h-4 w-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded"></div>
                    Category
                    <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={newCourse.category}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, category: e.target.value })
                    }
                    className="h-11 w-full border border-gray-300 rounded-md px-3 py-2 focus:border-amber-500 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">Choose a category</option>
                    <option value="fundamentals">Fundamentals</option>
                    <option value="programming_languages">Programming Languages</option>
                    <option value="databases">Databases</option>
                    <option value="ai_tools">AI Tools</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Instructors
                    <span className="text-xs text-gray-500">(optional)</span>
                  </Label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto bg-white">
                    {Array.isArray(availableInstructors) && availableInstructors.length > 0 ? (
                      <div className="space-y-2">
                        {availableInstructors.map((inst) => (
                          <label key={inst.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={selectedInstructors.includes(inst.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInstructors([...selectedInstructors, inst.id]);
                                } else {
                                  setSelectedInstructors(selectedInstructors.filter(id => id !== inst.id));
                                }
                              }}
                              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{inst.username}</div>
                              <div className="text-xs text-gray-500">{inst.email}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No instructors available
                      </div>
                    )}
                  </div>
                  {selectedInstructors.length > 0 && (
                    <div className="text-xs text-gray-600">
                      {selectedInstructors.length} instructor{selectedInstructors.length !== 1 ? 's' : ''} selected
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Select multiple instructors to assign to this course
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t">
                <DialogFooter className="gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddOpen(false);
                      setNewCourse({ name: "", short_code: "", category: "" });
                      setSelectedInstructors([]);
                    }}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={saving || !newCourse.name.trim() || !newCourse.category}
                    onClick={handleCreateCourse}
                    className="px-6 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Creating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create Course
                      </div>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* ---------------- Delete Confirmation Modal ---------------- */}
          <Dialog
            open={!!confirmDelete}
            onOpenChange={() => setConfirmDelete(null)}
          >
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                <DialogHeader className="space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Trash2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-white">
                        Delete Course
                      </DialogTitle>
                      <p className="text-red-100 text-sm mt-1">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <div className="flex items-start gap-4">
                  <div className="bg-red-50 p-3 rounded-full">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Are you absolutely sure?
                    </h3>
                    <p className="text-gray-600 mb-3">
                      This will permanently delete the course and all associated content including:
                    </p>
                    <ul className="text-sm text-gray-500 space-y-1 mb-4">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                        All course materials and resources
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                        Student progress and submissions
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                        Instructor assignments
                      </li>
                    </ul>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        <strong>Warning:</strong> This action cannot be reversed. Please be certain before proceeding.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t">
                <DialogFooter className="gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDelete(null)}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="px-6 bg-red-600 hover:bg-red-700"
                  >
                    {deleting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Deleting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Course
                      </div>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* ---------------- Edit Course Modal ---------------- */}
          <Dialog
            open={isEditOpen}
            onOpenChange={(open) => {
              setIsEditOpen(open);
              if (!open) {
                setEditCourseId(null);
                setEditSelectedInstructors([]);
                setEditInitialInstructors([]);
              }
            }}
          >
            <DialogContent className="sm:max-w-[500px] p-0 max-h-[90vh] overflow-y-auto">
              {/* Header with gradient background */}
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4">
                <DialogHeader className="space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Edit className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-white">
                        Edit Course
                      </DialogTitle>
                      <p className="text-amber-100 text-sm mt-1">
                        Update course information and settings
                      </p>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {/* Form Content */}
              <div className="px-6 py-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Course Name
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={newCourse.name}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, name: e.target.value })
                    }
                    className="h-11 border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">#</span>
                    Short Code
                  </Label>
                  <Input
                    value={newCourse.short_code}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, short_code: e.target.value })
                    }
                    className="h-11 border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <div className="h-4 w-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded"></div>
                    Category
                    <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={newCourse.category}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, category: e.target.value })
                    }
                    className="h-11 w-full border border-gray-300 rounded-md px-3 py-2 focus:border-amber-500 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">Select category</option>
                    <option value="fundamentals">Fundamentals</option>
                    <option value="programming_languages">Programming Languages</option>
                    <option value="databases">Databases</option>
                    <option value="ai_tools">AI Tools</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Instructors
                  </Label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto bg-white">
                    {Array.isArray(availableInstructors) && availableInstructors.length > 0 ? (
                      <div className="space-y-2">
                        {availableInstructors.map((inst) => (
                          <label key={inst.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={editSelectedInstructors.includes(inst.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditSelectedInstructors([...editSelectedInstructors, inst.id]);
                                } else {
                                  setEditSelectedInstructors(editSelectedInstructors.filter(id => id !== inst.id));
                                }
                              }}
                              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{inst.username}</div>
                              <div className="text-xs text-gray-500">{inst.email}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No instructors available
                      </div>
                    )}
                  </div>
                  {editSelectedInstructors.length > 0 && (
                    <div className="text-xs text-gray-600">
                      {editSelectedInstructors.length} instructor{editSelectedInstructors.length !== 1 ? 's' : ''} selected
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Manage instructor assignments for this course
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t">
                <DialogFooter className="gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditOpen(false);
                      setEditCourseId(null);
                      setEditSelectedInstructors([]);
                      setEditInitialInstructors([]);
                    }}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={saving || !newCourse.name.trim() || !newCourse.category}
                    onClick={handleUpdateCourse}
                    className="px-6 bg-amber-600 hover:bg-amber-700 text-white"
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
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Courses;
