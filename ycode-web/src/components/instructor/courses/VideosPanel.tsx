import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash, Edit, Plus, Video, ExternalLink } from "lucide-react";

import {
  fetchVideosBySubtopic,
  createVideo,
  updateVideo,
  deleteVideo,
} from "@/services/courseService";

type Video = {
  id: string;
  title: string;
  video_link: string;
  ai_context?: string | null;
  sub_topic: string;
};

const VideosPanel = ({ subtopic }: { subtopic: any }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [context, setContext] = useState("");

  // Delete Confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, [subtopic]);

  const loadVideos = async () => {
    if (!subtopic) return;
    setLoading(true);

    try {
      const res = await fetchVideosBySubtopic(subtopic.id);
      setVideos(res);
    } catch {
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  // OPEN CREATE
  const openCreateModal = () => {
    setMode("create");
    setEditingVideo(null);
    setTitle("");
    setLink("");
    setContext("");
    setIsModalOpen(true);
  };

  // OPEN EDIT
  const openEditModal = (v: Video) => {
    setMode("edit");
    setEditingVideo(v);
    setTitle(v.title);
    setLink(v.video_link);
    setContext(v.ai_context || "");
    setIsModalOpen(true);
  };

  // SAVE (Create or Update)
  const saveVideo = async () => {
    if (!title.trim() || !link.trim()) {
      toast.error("Title and link are required");
      return;
    }

    try {
      const payload = {
        title,
        video_link: link,
        ai_context: context,
        sub_topic: subtopic.id,
      };

      if (mode === "create") {
        const newVid = await createVideo(payload);
        setVideos((prev) => [...prev, newVid]);
        toast.success("Video created");
      } else if (editingVideo) {
        const updated = await updateVideo(editingVideo.id, payload);
        setVideos((prev) =>
          prev.map((v) => (v.id === updated.id ? updated : v))
        );
        toast.success("Video updated");
      }

      setIsModalOpen(false);
    } catch (err) {
      toast.error("Failed to save");
    }
  };

  // DELETE VIDEO
  const handleDelete = async () => {
    if (!confirmDeleteId) return;

    try {
      await deleteVideo(confirmDeleteId);
      setVideos((prev) => prev.filter((v) => v.id !== confirmDeleteId));
      toast.success("Video deleted");
    } catch {
      toast.error("Failed to delete");
    }

    setConfirmDeleteId(null);
  };

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Video className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Videos</h3>
            <p className="text-sm text-slate-600">Manage video content for this subtopic</p>
          </div>
        </div>
        <Button 
          onClick={openCreateModal} 
          className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Video
        </Button>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading videos...</div>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-4 bg-slate-100 rounded-full mb-4 w-fit mx-auto">
            <Video className="w-8 h-8 text-slate-400" />
          </div>
          <h4 className="text-lg font-medium text-slate-700 mb-2">No videos yet</h4>
          <p className="text-slate-500 mb-4">Add your first video to get started</p>
          <Button 
            onClick={openCreateModal}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Video
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((v) => (
            <div
              key={v.id}
              className="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-amber-600" />
                    <h4 className="font-semibold text-slate-900">{v.title}</h4>
                  </div>
                  <a
                    href={v.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {v.video_link.length > 50 ? `${v.video_link.substring(0, 50)}...` : v.video_link}
                  </a>
                  {v.ai_context && (
                    <div className="mt-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                      <span className="font-medium">AI Context:</span> {v.ai_context}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(v)}
                    className="h-8 w-8 p-0 hover:bg-amber-50 hover:text-amber-600"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDeleteId(v.id)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="bg-gradient-to-r from-amber-50 to-orange-50 -m-6 mb-0 p-6 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Video className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  {mode === "create" ? "Add Video" : "Edit Video"}
                </DialogTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {mode === "create" ? "Add a new video to this subtopic" : "Update video information"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Video Title</Label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title..."
                className="border-slate-200 focus:border-amber-300 focus:ring-amber-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Video URL</Label>
              <Input 
                value={link} 
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="border-slate-200 focus:border-amber-300 focus:ring-amber-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">AI Context (Optional)</Label>
              <Input
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Additional context for AI processing..."
                className="border-slate-200 focus:border-amber-300 focus:ring-amber-200"
              />
              <p className="text-xs text-slate-500">This helps AI understand the video content better</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveVideo}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {mode === "create" ? "Create Video" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={() => setConfirmDeleteId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="bg-gradient-to-r from-red-50 to-pink-50 -m-6 mb-0 p-6 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-900">Delete Video</DialogTitle>
                <p className="text-sm text-slate-600 mt-1">This action cannot be undone</p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <p className="text-slate-700">Are you sure you want to delete this video? This will permanently remove it from the subtopic.</p>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setConfirmDeleteId(null)}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideosPanel;
