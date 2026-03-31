// src/components/admin/subjects/VideosPanel.tsx
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
import { Trash, Edit, Plus, Video as VideoIcon } from "lucide-react";

import {
  fetchVideosBySubUnit,
  createVideo,
  updateVideo,
  deleteVideo,
} from "@/services/subjectService";

interface Video {
  id: string;
  title: string;
  video_link: string;
  ai_context?: string | null;
  sub_unit: string;
}

const VideosPanel: React.FC<{ subUnitId: string }> = ({ subUnitId }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subUnitId) loadVideos();
  }, [subUnitId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const data = await fetchVideosBySubUnit(subUnitId);
      setVideos(data as Video[]);
    } catch {
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditVideo(null);
    setTitle("");
    setLink("");
    setIsModalOpen(true);
  };

  const openEditModal = (v: Video) => {
    setEditVideo(v);
    setTitle(v.title);
    setLink(v.video_link);
    setIsModalOpen(true);
  };

  const saveVideo = async () => {
    if (!title.trim() || !link.trim()) {
      toast.error("Title and link are required");
      return;
    }

    try {
      setSaving(true);
      if (editVideo) {
        await updateVideo(editVideo.id, { title, video_link: link });
        toast.success("Video updated");
      } else {
        await createVideo({ title, video_link: link, sub_unit: subUnitId });
        toast.success("Video added");
      }
      setIsModalOpen(false);
      loadVideos();
    } catch {
      toast.error("Failed to save video");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this video?")) return;
    try {
      await deleteVideo(id);
      toast.success("Video deleted");
      loadVideos();
    } catch {
      toast.error("Failed to delete video");
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading videos...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <VideoIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Videos</h3>
            <p className="text-sm text-slate-600">Educational video content for this sub-unit</p>
          </div>
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Video
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map((v) => (
          <div key={v.id} className="border rounded-xl p-4 bg-white flex flex-col gap-3 group hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <div className="font-bold text-slate-900 line-clamp-2">{v.title}</div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => openEditModal(v)} className="h-8 w-8 text-slate-400 hover:text-blue-600">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-blue-500 font-mono truncate">{v.video_link}</div>
          </div>
        ))}
        {videos.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed rounded-xl">
            No videos uploaded yet
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editVideo ? "Edit Video" : "Add Video"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Video Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Variables" />
            </div>
            <div className="space-y-2">
              <Label>Video Link (YouTube/Vimeo/etc.)</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={saveVideo} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideosPanel;
