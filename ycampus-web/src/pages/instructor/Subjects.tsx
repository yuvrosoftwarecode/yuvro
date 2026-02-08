import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, BookOpen, Users, CheckCircle } from "lucide-react";

import {
  fetchSubjects,
  createSubject,
  deleteSubject,
  updateSubject,
  fetchAllInstructors,
  fetchSubjectInstructors,
  addInstructorToSubject,
  removeInstructorFromSubject,
} from "@/services/subjectService";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import RoleSidebar from "../../components/common/RoleSidebar";
import RoleHeader from "../../components/common/RoleHeader";
import { toast } from "sonner";

type Subject = {
  id: string | number;
  short_code: string | null;
  name: string;
  category: "fundamentals" | "programming_languages" | "databases" | "ai_tools";
};

type Instructor = {
  id: string | number;
  username: string;
  email: string;
};

const CATEGORY_LABELS: Record<Subject["category"], string> = {
  fundamentals: "Fundamentals",
  programming_languages: "Programming Languages",
  databases: "Databases",
  ai_tools: "AI Tools",
};

const CATEGORY_GRADIENTS: Record<Subject["category"], string> = {
  fundamentals: "from-blue-900 to-blue-700",
  programming_languages: "from-purple-900 to-purple-700",
  databases: "from-green-900 to-green-700",
  ai_tools: "from-orange-900 to-orange-700",
};

const Subjects: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Subject["category"]>('fundamentals');

  // Add Subject Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: "",
    short_code: "",
    category: "" as Subject["category"] | "",
  });
  const [saving, setSaving] = useState(false);

  // Delete Confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit Subject Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSubjectId, setEditSubjectId] = useState<string | number | null>(null);

  // Instructor-related state
  const [availableInstructors, setAvailableInstructors] = useState<Instructor[]>([]);
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]); // for Add
  const [editSelectedInstructors, setEditSelectedInstructors] = useState<string[]>([]); // for Edit
  const [editInitialInstructors, setEditInitialInstructors] = useState<string[]>([]); // to compute diff

  // --------------------------------------------------
  // Load Subjects
  // --------------------------------------------------
  useEffect(() => {
    loadSubjects();
  }, [user?.id]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await fetchSubjects();

      if (user?.role === "instructor") {
        const mySubjects = [];
        for (const s of data) {
          const instructors = await fetchSubjectInstructors(s.id);
          const isAssigned = (instructors as any[]).some(
            (inst: any) => inst.id === user.id
          );
          if (isAssigned) mySubjects.push(s);
        }
        setSubjects(mySubjects as Subject[]);
      } else {
        setSubjects(data as Subject[]);
      }
    } catch (err) {
      console.error("Failed to load subjects", err);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };


  const loadInstructors = async () => {
    try {
      if (availableInstructors.length === 0) {
        const data = await fetchAllInstructors();
        setAvailableInstructors(data as Instructor[]);
      }
    } catch (err) {
      console.error("Failed to load instructors", err);
      toast.error("Failed to load instructors");
    }
  };

  useEffect(() => {
    if (isAddOpen || isEditOpen) {
      loadInstructors();
    }
  }, [isAddOpen, isEditOpen]);

  const filteredSubjects = subjects.filter(subject => subject.category === activeTab);

  const handleTabChange = (tab: Subject["category"]) => {
    setActiveTab(tab);
  };

  const subjectCounts = subjects.reduce((acc: any, subject) => {
    acc[subject.category] = (acc[subject.category] || 0) + 1;
    return acc;
  }, {});

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);

    try {
      await deleteSubject(confirmDelete);
      toast.success("Subject deleted successfully");
      setConfirmDelete(null);
      loadSubjects();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete subject");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubject.name.trim()) {
      toast.error("Subject name is required");
      return;
    }

    if (!newSubject.category) {
      toast.error("Please select a category");
      return;
    }

    try {
      setSaving(true);
      const created = (await createSubject(newSubject)) as any;

      if (selectedInstructors.length > 0) {
        for (const instructorId of selectedInstructors) {
          try {
            await addInstructorToSubject(created.id, instructorId);
          } catch (e) {
            console.error("Failed to assign instructor", e);
          }
        }
      }

      toast.success("Subject created successfully");
      setNewSubject({ name: "", short_code: "", category: "" });
      setSelectedInstructors([]);
      setIsAddOpen(false);
      loadSubjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create subject");
    } finally {
      setSaving(false);
    }
  };

  const openEditSubjectModal = async (subject: Subject) => {
    setEditSubjectId(subject.id);
    setNewSubject({
      name: subject.name,
      short_code: subject.short_code || "",
      category: subject.category,
    });
    setIsEditOpen(true);

    try {
      const mappings = (await fetchSubjectInstructors(subject.id)) as any[];
      const instructorIds = mappings.map((m: any) => m.id.toString());
      setEditSelectedInstructors(instructorIds);
      setEditInitialInstructors(instructorIds);
    } catch (err) {
      console.error("Failed to load subject instructors", err);
      toast.error("Failed to load subject instructors");
    }
  };

  const handleUpdateSubject = async () => {
    if (!editSubjectId) return;

    try {
      setSaving(true);
      await updateSubject(editSubjectId, newSubject);

      const toAdd = editSelectedInstructors.filter((id) => !editInitialInstructors.includes(id));
      const toRemove = editInitialInstructors.filter((id) => !editSelectedInstructors.includes(id));

      for (const id of toAdd) {
        try {
          await addInstructorToSubject(editSubjectId, id);
        } catch (e) { console.error(e); }
      }

      for (const id of toRemove) {
        try {
          await removeInstructorFromSubject(editSubjectId, id);
        } catch (e) { console.error(e); }
      }

      toast.success("Subject updated successfully");
      setIsEditOpen(false);
      setEditSubjectId(null);
      setEditSelectedInstructors([]);
      setEditInitialInstructors([]);
      loadSubjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update subject");
    } finally {
      setSaving(false);
    }
  };

  const headerActions = (
    <Button
      onClick={() => setIsAddOpen(true)}
      className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
    >
      + Add New Subject
    </Button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
            title="Subject Management"
            subtitle={user?.role === "admin"
              ? "Create, edit, and manage all subjects in the system"
              : "Manage your assigned subjects and content"
            }
            actions={headerActions}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <nav className="flex space-x-8">
                {(['fundamentals', 'programming_languages', 'databases', 'ai_tools'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => handleTabChange(key)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <span>{CATEGORY_LABELS[key]}</span>
                    <span className={`rounded-full px-2 py-1 text-xs ${activeTab === key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {subjectCounts[key] || 0}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading subjects...</span>
              </div>
            )}

            {!loading && filteredSubjects.length === 0 && (
              <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
                No {CATEGORY_LABELS[activeTab]} subjects found.
              </div>
            )}

            {!loading && filteredSubjects.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSubjects.map((subject) => (
                  <Card key={subject.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white rounded-xl">
                    <CardContent className="p-0">
                      <div className={`bg-gradient-to-r ${CATEGORY_GRADIENTS[subject.category]} p-4 text-white`}>
                        <div className="flex items-center gap-2 mb-2 text-white/70 text-xs uppercase font-medium">
                          <BookOpen className="h-4 w-4" />
                          {CATEGORY_LABELS[subject.category]}
                        </div>
                        <h3 className="font-bold text-lg leading-tight mb-2">{subject.name}</h3>
                        {subject.short_code && (
                          <div className="inline-block bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold">
                            {subject.short_code}
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex items-center justify-between">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => navigate(`/instructor/subjects/${subject.id}/manage`)}
                          className="bg-black hover:bg-gray-800 text-white"
                        >
                          Manage
                        </Button>
                        {user?.role === "admin" && (
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditSubjectModal(subject)} className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(subject.id)} className="h-8 w-8 text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add Subject Dialog */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Subject</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Subject Name</Label>
                  <Input
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Short Code</Label>
                  <Input
                    value={newSubject.short_code}
                    onChange={(e) => setNewSubject({ ...newSubject, short_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={newSubject.category}
                    onChange={(e) => setNewSubject({ ...newSubject, category: e.target.value as any })}
                  >
                    <option value="">Select Category</option>
                    <option value="fundamentals">Fundamentals</option>
                    <option value="programming_languages">Programming Languages</option>
                    <option value="databases">Databases</option>
                    <option value="ai_tools">AI Tools</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Instructors</Label>
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                    {availableInstructors.map((inst) => (
                      <label key={inst.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedInstructors.includes(inst.id.toString())}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedInstructors([...selectedInstructors, inst.id.toString()]);
                            else setSelectedInstructors(selectedInstructors.filter(id => id !== inst.id.toString()));
                          }}
                        />
                        <span className="text-sm">{inst.username}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button disabled={saving} onClick={handleCreateSubject}>
                  {saving ? "Creating..." : "Create Subject"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Subject Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Subject</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Subject Name</Label>
                  <Input
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Short Code</Label>
                  <Input
                    value={newSubject.short_code}
                    onChange={(e) => setNewSubject({ ...newSubject, short_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={newSubject.category}
                    onChange={(e) => setNewSubject({ ...newSubject, category: e.target.value as any })}
                  >
                    <option value="fundamentals">Fundamentals</option>
                    <option value="programming_languages">Programming Languages</option>
                    <option value="databases">Databases</option>
                    <option value="ai_tools">AI Tools</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Instructors</Label>
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                    {availableInstructors.map((inst) => (
                      <label key={inst.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editSelectedInstructors.includes(inst.id.toString())}
                          onChange={(e) => {
                            if (e.target.checked) setEditSelectedInstructors([...editSelectedInstructors, inst.id.toString()]);
                            else setEditSelectedInstructors(editSelectedInstructors.filter(id => id !== inst.id.toString()));
                          }}
                        />
                        <span className="text-sm">{inst.username}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button disabled={saving} onClick={handleUpdateSubject}>
                  {saving ? "Updating..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Subject</DialogTitle>
              </DialogHeader>
              <div className="py-4">Are you sure you want to delete this subject? This action cannot be undone.</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Subjects;
