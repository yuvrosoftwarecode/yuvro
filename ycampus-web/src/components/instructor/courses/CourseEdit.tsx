// src/pages/instructor/CourseEdit.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth, User } from "../../../contexts/AuthContext";
import VideosPanel from "./VideosPanel";
import NotesManager from "@/components/instructor/courses/NotesManager";
import QuestionBankManager from "@/components/instructor/courses/QuestionBankManager";
import RoleSidebar from "../../common/RoleSidebar";
import RoleHeader from "../../common/RoleHeader";
import Navigation from "../../common/Navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2,
  Edit3,
  Plus,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Video,
  FileQuestion,
  Code,
  FileText,
  ArrowLeft,
  Settings,
  Layers3,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";

import {
  fetchCourseById,
  updateCourse,
  deleteCourse,
  fetchTopicsByCourse,
  createTopic,
  updateTopic,
  deleteTopic,
  fetchSubtopicsByTopic,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic,
} from "@/services/courseService";

type Category = "fundamentals" | "programming_languages" | "databases" | "ai_tools";

const CATEGORY_LABELS: Record<Category, string> = {
  fundamentals: "Fundamentals",
  programming_languages: "Programming Languages",
  databases: "Databases",
  ai_tools: "AI Tools",
};

type Course = {
  id: string;
  short_code: string | null;
  name: string;
  category: Category;
};

type Topic = {
  id: string;
  name: string;
  order_index: number;
  course: string;
};

type Subtopic = {
  id: string;
  name: string;
  order_index: number;
  topic: string;
  content?: string | null;
};

const CourseEdit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: courseId } = useParams<{ id: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [subtopicsMap, setSubtopicsMap] = useState<Record<string, Subtopic[]>>({});
  const [savingCourse, setSavingCourse] = useState(false);

  // Topic modal
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicModalMode, setTopicModalMode] = useState<"create" | "edit">("create");
  const [topicEditing, setTopicEditing] = useState<Topic | null>(null);
  const [topicNameValue, setTopicNameValue] = useState("");
  const [topicOrderValue, setTopicOrderValue] = useState<number | null>(null);
  const [savingTopic, setSavingTopic] = useState(false);

  // Subtopic modal
  const [isSubtopicModalOpen, setIsSubtopicModalOpen] = useState(false);
  const [subtopicModalMode, setSubtopicModalMode] = useState<"create" | "edit">("create");
  const [subtopicEditing, setSubtopicEditing] = useState<Subtopic | null>(null);
  const [subtopicNameValue, setSubtopicNameValue] = useState("");
  const [subtopicOrderValue, setSubtopicOrderValue] = useState<number | null>(null);
  const [subtopicContentValue, setSubtopicContentValue] = useState("");
  const [savingSubtopic, setSavingSubtopic] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "course" | "topic" | "subtopic";
    id?: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Selected topic and subtopic (for right panel)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<Subtopic | null>(null);

  // Right-panel tab state
  const [rightTab, setRightTab] = useState<"videos" | "notes" | "questions">("questions");

  // Course editing state
  const [editCourseValues, setEditCourseValues] = useState({
    name: "",
    short_code: "",
    category: "fundamentals" as Category,
  });

  // Load data
  useEffect(() => {
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const loadCourse = async () => {
    if (!courseId) return;
    setLoading(true);

    try {
      const c = await fetchCourseById(courseId);
      console.log('Loaded course data:', c);
      setCourse(c);

      // Initialize edit form with course data
      setEditCourseValues({
        name: c.name || "",
        short_code: c.short_code || "",
        category: c.category || "fundamentals",
      });

      const t = await fetchTopicsByCourse(courseId);
      setTopics(t);

      const expanded: Record<string, boolean> = {};
      t.forEach((topic) => (expanded[topic.id] = false));
      setExpandedTopics(expanded);

      setSubtopicsMap({});
      setSelectedSubtopic(null);
    } catch (err) {
      toast.error("Failed to load course");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandTopic = async (topicId: string) => {
    const currentlyExpanded = !!expandedTopics[topicId];

    if (!currentlyExpanded && !subtopicsMap[topicId]) {
      try {
        const subs = await fetchSubtopicsByTopic(topicId);
        setSubtopicsMap((prev) => ({ ...prev, [topicId]: subs }));
      } catch (err) {
        toast.error("Failed to load subtopics");
        console.error(err);
      }
    }

    setExpandedTopics((prev) => ({ ...prev, [topicId]: !currentlyExpanded }));
  };

  // Save course
  const handleSaveCourse = async () => {
    if (!course) return;
    setSavingCourse(true);

    try {
      const payload = {
        name: editCourseValues.name,
        short_code: editCourseValues.short_code || null,
        category: editCourseValues.category,
      };

      await updateCourse(course.id, payload);

      toast.success("Course updated successfully");

      await loadCourse();           // ✅ REFRESH COURSE STATE
    } catch (err) {
      toast.error("Failed to update course");
      console.error(err);
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!course) return;

    setDeleting(true);
    try {
      await deleteCourse(course.id);
      toast.success("Course deleted");
      navigate("/instructor/courses");
    } catch (err) {
      toast.error("Failed to delete course");
      console.error(err);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  // Topic CRUD
  const openCreateTopicModal = () => {
    setTopicModalMode("create");
    setTopicEditing(null);
    setTopicNameValue("");
    setTopicOrderValue(null);
    setIsTopicModalOpen(true);
  };

  const openEditTopicModal = (topic: Topic) => {
    setTopicModalMode("edit");
    setTopicEditing(topic);
    setTopicNameValue(topic.name);
    setTopicOrderValue(topic.order_index ?? null);
    setIsTopicModalOpen(true);
  };

  const saveTopic = async () => {
    if (!course) return;
    if (!topicNameValue.trim()) {
      toast.error("Topic name is required");
      return;
    }

    setSavingTopic(true);

    try {
      if (topicModalMode === "create") {
        const payload = {
          name: topicNameValue,
          course: course.id,
          order_index: topicOrderValue ?? 0,
        };

        const created = await createTopic(payload);
        setTopics((prev) => [...prev, created]);
        toast.success("Topic added");
      } else if (topicEditing) {
        const payload = {
          name: topicNameValue,
          order_index: topicOrderValue ?? topicEditing.order_index,
          course: topicEditing.course,
        };

        const updated = await updateTopic(topicEditing.id, payload);
        setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        toast.success("Topic updated");
      }

      setIsTopicModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save topic");
      console.error(err);
    } finally {
      setSavingTopic(false);
    }
  };

  const handleDeleteTopic = async (topicId?: string) => {
    if (!topicId) return;

    setDeleting(true);

    try {
      await deleteTopic(topicId);
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
      setSubtopicsMap((prev) => {
        const copy = { ...prev };
        delete copy[topicId];
        return copy;
      });
      // if selected subtopic belonged to deleted topic, clear selection
      if (selectedSubtopic && selectedSubtopic.topic === topicId) {
        setSelectedSubtopic(null);
      }
      toast.success("Topic deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete topic");
      console.error(err);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  // Subtopic CRUD
  const openCreateSubtopicModal = (topicId: string) => {
    setSubtopicModalMode("create");
    setSubtopicEditing({
      id: "",
      name: "",
      order_index: 0,
      topic: topicId,
    });
    setSubtopicNameValue("");
    setSubtopicOrderValue(null);
    setSubtopicContentValue("");
    setIsSubtopicModalOpen(true);
  };

  const openEditSubtopicModal = (sub: Subtopic) => {
    setSubtopicModalMode("edit");
    setSubtopicEditing(sub);
    setSubtopicNameValue(sub.name);
    setSubtopicOrderValue(sub.order_index ?? null);
    setSubtopicContentValue(sub.content ?? "");
    setIsSubtopicModalOpen(true);
  };

  const saveSubtopic = async () => {
    if (!subtopicEditing) return;
    if (!subtopicNameValue.trim()) {
      toast.error("Subtopic name required");
      return;
    }

    setSavingSubtopic(true);

    try {
      if (subtopicModalMode === "create") {
        const payload = {
          name: subtopicNameValue,
          topic: subtopicEditing.topic,
          order_index: subtopicOrderValue ?? 0,
          content: subtopicContentValue || "",
        };

        const created = await createSubtopic(payload);

        setSubtopicsMap((prev) => {
          const arr = prev[subtopicEditing.topic] || [];
          return { ...prev, [subtopicEditing.topic]: [...arr, created] };
        });

        toast.success("Subtopic created");
      } else {
        const payload = {
          name: subtopicNameValue,
          order_index: subtopicOrderValue ?? subtopicEditing.order_index,
          content: subtopicContentValue,
          topic: subtopicEditing.topic,
        };

        const updated = await updateSubtopic(subtopicEditing.id, payload);

        setSubtopicsMap((prev) => {
          const arr = prev[updated.topic] || [];
          return {
            ...prev,
            [updated.topic]: arr.map((s) =>
              s.id === updated.id ? updated : s
            ),
          };
        });

        // if the updated subtopic is currently selected, refresh selection
        if (selectedSubtopic && selectedSubtopic.id === updated.id) {
          setSelectedSubtopic(updated);
        }

        toast.success("Subtopic updated");
      }

      setIsSubtopicModalOpen(false);
    } catch (err) {
      toast.error("Failed to save subtopic");
      console.error(err);
    } finally {
      setSavingSubtopic(false);
    }
  };

  const handleDeleteSubtopic = async (subtopicId?: string) => {
    if (!subtopicId) return;

    setDeleting(true);

    try {
      await deleteSubtopic(subtopicId);

      setSubtopicsMap((prev) => {
        const copy: any = { ...prev };
        for (const key of Object.keys(copy)) {
          copy[key] = copy[key].filter((s: Subtopic) => s.id !== subtopicId);
        }
        return copy;
      });

      if (selectedSubtopic && selectedSubtopic.id === subtopicId) {
        setSelectedSubtopic(null);
      }

      toast.success("Subtopic deleted");
    } catch (err) {
      toast.error("Failed to delete subtopic");
      console.error(err);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  if (!courseId) return <div className="min-h-screen flex items-center justify-center">No course selected</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
            title={course?.name ? course.name : 'Loading Course...'}
            subtitle={course ? `Category: ${CATEGORY_LABELS[course.category] || course.category}${course.short_code ? ` • Code: ${course.short_code}` : ''}` : 'Loading course details...'}
          />

          {/* Main content */}
          <div className="p-6">
            <div className="h-full w-full px-4 py-6 flex gap-6">
              {/* Left Sidebar - Course Structure */}
              <div className="w-[360px] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 flex flex-col overflow-hidden">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-slate-200/60 bg-gradient-to-r from-amber-50 to-orange-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Layers3 className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">Course Structure</h3>
                        <p className="text-xs text-slate-600">Topics & Subtopics</p>
                      </div>
                    </div>
                    <Button
                      onClick={openCreateTopicModal}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm text-xs px-2 py-1"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Topics List */}
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {topics.length === 0 && (
                      <div className="text-center py-12">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No topics yet</p>
                        <p className="text-sm text-slate-400 mt-1">Create your first topic to get started</p>
                      </div>
                    )}

                    {topics.map((topic) => {
                      const expanded = !!expandedTopics[topic.id];
                      const subs = subtopicsMap[topic.id] || [];
                      const isSelected = selectedTopic?.id === topic.id;

                      return (
                        <div
                          key={topic.id}
                          className={`group backdrop-blur-sm border rounded-lg p-3 hover:shadow-md transition-all duration-200 cursor-pointer ${isSelected
                            ? "bg-amber-50/80 border-amber-200 shadow-sm"
                            : "bg-white/70 border-slate-200/60"
                            }`}
                          onClick={async () => {
                            if (isSelected && !selectedSubtopic) {
                              // If already selected but no subtopic is selected, toggle collapse/expand
                              await toggleExpandTopic(topic.id);
                            } else if (isSelected && selectedSubtopic) {
                              // If already selected and a subtopic is selected, just clear subtopic selection
                              setSelectedSubtopic(null);
                              setRightTab("questions");
                            } else {
                              // If not selected, select and expand
                              setSelectedTopic(topic);
                              setSelectedSubtopic(null);
                              setRightTab("questions");
                              // Auto-expand the topic if not already expanded
                              if (!expanded) {
                                await toggleExpandTopic(topic.id);
                              }
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div
                                className={`font-medium text-sm transition-colors ${isSelected
                                  ? "text-amber-700"
                                  : "text-slate-900 group-hover:text-amber-700"
                                  }`}
                              >
                                {topic.name}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandTopic(topic.id);
                                }}
                                className="h-6 w-6 p-0 hover:bg-amber-50 hover:text-amber-600"
                              >
                                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditTopicModal(topic);
                                }}
                                className="h-6 w-6 p-0 hover:bg-amber-50 hover:text-amber-600"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDelete({ type: "topic", id: topic.id });
                                }}
                                className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {expanded && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-medium text-slate-700 flex items-center gap-1">
                                  <Layers3 className="w-3 h-3" />
                                  Subtopics
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => openCreateSubtopicModal(topic.id)}
                                  variant="outline"
                                  className="h-6 text-xs border-amber-200 text-amber-600 hover:bg-amber-50 px-2"
                                >
                                  <Plus className="w-2 h-2 mr-1" />
                                  Add
                                </Button>
                              </div>

                              <div className="space-y-2">
                                {subs.length === 0 && (
                                  <div className="text-center py-6">
                                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs text-slate-500">No subtopics yet</p>
                                  </div>
                                )}

                                {subs.map((s) => (
                                  <div
                                    key={s.id}
                                    className={`group p-2 rounded-md border cursor-pointer transition-all duration-200 ${selectedSubtopic?.id === s.id
                                      ? "bg-amber-50 border-amber-200 shadow-sm"
                                      : "bg-white/50 border-slate-200/60 hover:bg-white hover:shadow-sm"
                                      }`}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent event bubbling to parent topic
                                      setSelectedSubtopic(s);
                                      // Also set the selected topic
                                      const parentTopic = topics.find(topic => topic.id === s.topic);
                                      setSelectedTopic(parentTopic || null);
                                      setRightTab("videos");
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className={`font-medium text-xs ${selectedSubtopic?.id === s.id ? "text-amber-900" : "text-slate-800"}`}>
                                          {s.name}
                                        </div>
                                      </div>

                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openEditSubtopicModal(s);
                                          }}
                                          className="h-5 w-5 p-0 hover:bg-amber-50 hover:text-amber-600"
                                        >
                                          <Edit3 className="w-2.5 h-2.5" />
                                        </Button>

                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDelete({ type: "subtopic", id: s.id });
                                          }}
                                          className="h-5 w-5 p-0 hover:bg-red-50 hover:text-red-600"
                                        >
                                          <Trash2 className="w-2.5 h-2.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Right Panel - Content Management */}
              <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 flex flex-col overflow-hidden">
                {/* Content Header */}
                <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-indigo-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Content Management</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {selectedSubtopic ? `Editing: ${selectedSubtopic.name}` : "Select a subtopic to manage content"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Videos and Notes tabs - only show when subtopic is selected */}
                      {selectedSubtopic && (
                        <>
                          <button
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm ${rightTab === "videos"
                              ? "bg-amber-600 text-white shadow-md hover:bg-amber-700"
                              : "text-slate-700 bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                              }`}
                            onClick={() => setRightTab("videos")}
                          >
                            <Video className="w-4 h-4" />
                            Videos
                          </button>
                          <button
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm ${rightTab === "notes"
                              ? "bg-amber-600 text-white shadow-md hover:bg-amber-700"
                              : "text-slate-700 bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                              }`}
                            onClick={() => setRightTab("notes")}
                          >
                            <FileText className="w-4 h-4" />
                            Notes
                          </button>
                        </>
                      )}

                      {/* Question Bank - always visible */}
                      <button
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition-all shadow-sm ${rightTab === "questions"
                          ? "bg-amber-600 text-white shadow-md hover:bg-amber-700"
                          : "text-slate-700 bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                          }`}
                        onClick={() => setRightTab("questions")}
                      >
                        <FileQuestion className="w-4 h-4" />
                        Question Bank
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto">
                  {rightTab === "questions" ? (
                    <QuestionBankManager
                      course={course}
                      selectedTopic={selectedTopic}
                      selectedSubtopic={selectedSubtopic}
                      topics={topics}
                    />
                  ) : rightTab === "videos" && selectedSubtopic ? (
                    <VideosPanel subtopic={selectedSubtopic} />
                  ) : rightTab === "notes" && selectedSubtopic ? (
                    <NotesManager subtopicId={selectedSubtopic.id} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-12">
                      <div className="p-4 bg-slate-100 rounded-full mb-6">
                        <BookOpen className="w-12 h-12 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-700 mb-2">
                        {!selectedSubtopic ? "Select a Subtopic" : "Content Not Available"}
                      </h3>
                      <p className="text-slate-500 max-w-md">
                        {!selectedSubtopic
                          ? "Choose a subtopic from the course structure on the left to start managing its content, videos, and notes."
                          : "This content type is not available for the current selection."
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Modal */}
      <Dialog open={isTopicModalOpen} onOpenChange={setIsTopicModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{topicModalMode === "create" ? "Add Topic" : "Edit Topic"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Topic Name</Label>
              <Input value={topicNameValue} onChange={(e) => setTopicNameValue(e.target.value)} />
            </div>

            <div>
              <Label>Order Index (optional)</Label>
              <Input type="number" value={topicOrderValue ?? ""} onChange={(e) => setTopicOrderValue(e.target.value ? Number(e.target.value) : null)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTopicModalOpen(false)}>Cancel</Button>
            <Button onClick={saveTopic} disabled={savingTopic}>{savingTopic ? "Saving..." : (topicModalMode === "create" ? "Create Topic" : "Save Changes")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subtopic Modal */}
      <Dialog open={isSubtopicModalOpen} onOpenChange={setIsSubtopicModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{subtopicModalMode === "create" ? "Add Subtopic" : "Edit Subtopic"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Subtopic Name</Label>
              <Input value={subtopicNameValue} onChange={(e) => setSubtopicNameValue(e.target.value)} />
            </div>

            <div>
              <Label>Order Index (optional)</Label>
              <Input type="number" value={subtopicOrderValue ?? ""} onChange={(e) => setSubtopicOrderValue(e.target.value ? Number(e.target.value) : null)} />
            </div>

            <div>
              <Label>Content (optional)</Label>
              <Input value={subtopicContentValue} onChange={(e) => setSubtopicContentValue(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubtopicModalOpen(false)}>Cancel</Button>
            <Button onClick={saveSubtopic} disabled={savingSubtopic}>{savingSubtopic ? "Saving..." : (subtopicModalMode === "create" ? "Create Subtopic" : "Save Changes")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p>Are you sure you want to delete this {confirmDelete?.type}?</p>
            <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>

            {confirmDelete?.type === "course" && (
              <Button variant="destructive" onClick={handleDeleteCourse} disabled={deleting}>{deleting ? "Deleting..." : "Delete Course"}</Button>
            )}
            {confirmDelete?.type === "topic" && (
              <Button variant="destructive" onClick={() => handleDeleteTopic(confirmDelete.id)} disabled={deleting}>{deleting ? "Deleting..." : "Delete Topic"}</Button>
            )}
            {confirmDelete?.type === "subtopic" && (
              <Button variant="destructive" onClick={() => handleDeleteSubtopic(confirmDelete.id)} disabled={deleting}>{deleting ? "Deleting..." : "Delete Subtopic"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseEdit;