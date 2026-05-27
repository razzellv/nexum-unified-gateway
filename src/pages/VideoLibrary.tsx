import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  listVideos, getVideoBlob, updateVideoMeta, deleteVideo,
  VideoMeta, formatBytes, formatDuration,
} from "@/lib/videoLibraryDB";
import {
  Play, Download, Trash2, Pencil, X, Check, Video, ChevronLeft,
  Clock, HardDrive, Calendar, Tag,
} from "lucide-react";

export default function VideoLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTags, setEditTags] = useState("");
  const prevUrl = useRef<string | null>(null);

  // Must be before any early return (Rules of Hooks)
  useEffect(() => {
    if (user?.role !== "admin") return;
    listVideos().then(setVideos).finally(() => setLoading(false));
  }, [user?.role]);

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Admin access required.
      </div>
    );
  }

  async function openPlayer(id: string) {
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    const blob = await getVideoBlob(id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    prevUrl.current = url;
    setPlayUrl(url);
    setPlayingId(id);
  }

  function closePlayer() {
    if (prevUrl.current) { URL.revokeObjectURL(prevUrl.current); prevUrl.current = null; }
    setPlayUrl(null);
    setPlayingId(null);
  }

  async function downloadVideo(id: string) {
    const meta = videos.find((v) => v.id === id);
    const blob = await getVideoBlob(id);
    if (!blob || !meta) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.title.replace(/[^a-z0-9]/gi, "_")}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this recording?")) return;
    await deleteVideo(id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
    if (playingId === id) closePlayer();
  }

  function startEdit(v: VideoMeta) {
    setEditId(v.id);
    setEditTitle(v.title);
    setEditDesc(v.description);
    setEditTags(v.tags.join(", "));
  }

  async function saveEdit() {
    if (!editId) return;
    const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean);
    await updateVideoMeta(editId, editTitle, editDesc, tags);
    setVideos((prev) =>
      prev.map((v) => v.id === editId ? { ...v, title: editTitle, description: editDesc, tags } : v)
    );
    setEditId(null);
  }

  const playing = videos.find((v) => v.id === playingId);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-violet-400" />
          <h1 className="text-lg font-bold text-white">Nexum Training Video Library</h1>
          <span className="text-[11px] bg-violet-700/50 text-violet-300 px-2 py-0.5 rounded-full ml-1">
            ADMIN
          </span>
        </div>
        <div className="ml-auto text-sm text-gray-500">
          {videos.length} recording{videos.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading && (
          <div className="text-center text-gray-500 py-20">Loading recordings…</div>
        )}

        {!loading && videos.length === 0 && (
          <div className="text-center py-20">
            <Video className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium mb-2">No recordings yet</p>
            <p className="text-gray-600 text-sm">
              Open the Demo Mode panel and press Record to capture training videos.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div
              key={v.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-violet-500/40 transition-colors"
            >
              {/* Thumbnail / preview area */}
              <div
                className="bg-gradient-to-br from-violet-950 to-gray-900 h-36 flex items-center justify-center cursor-pointer group relative"
                onClick={() => openPlayer(v.id)}
              >
                <div className="w-12 h-12 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center group-hover:bg-violet-600/50 transition-colors">
                  <Play className="w-5 h-5 text-violet-300 ml-0.5" />
                </div>
                <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-gray-300 px-1.5 py-0.5 rounded">
                  {formatDuration(v.durationSec)}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                {editId === v.id ? (
                  <div className="space-y-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-violet-500"
                      placeholder="Title"
                    />
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-violet-500 resize-none"
                      placeholder="Description"
                    />
                    <input
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
                      placeholder="Tags (comma separated)"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="flex items-center gap-1 text-xs bg-violet-600 hover:bg-violet-700 text-white px-2 py-1 rounded transition-colors">
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-white px-2 py-1">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">
                        {v.title}
                      </h3>
                      <button
                        onClick={() => startEdit(v)}
                        className="flex-shrink-0 text-gray-600 hover:text-violet-400 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {v.description && (
                      <p className="text-[11px] text-gray-500 mb-2 line-clamp-2">{v.description}</p>
                    )}
                    {v.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {v.tags.map((t) => (
                          <span key={t} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDuration(v.durationSec)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" /> {formatBytes(v.sizeBytes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openPlayer(v.id)}
                        className="flex items-center gap-1 text-xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Play className="w-3 h-3" /> Play
                      </button>
                      <button
                        onClick={() => downloadVideo(v.id)}
                        className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="ml-auto text-gray-600 hover:text-red-400 transition-colors p-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video player modal */}
      {playUrl && playing && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closePlayer}
        >
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold truncate">{playing.title}</h3>
              <button onClick={closePlayer} className="text-gray-400 hover:text-white ml-4">
                <X className="w-5 h-5" />
              </button>
            </div>
            <video
              src={playUrl}
              controls
              autoPlay
              className="w-full rounded-xl bg-black max-h-[70vh]"
            />
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500">
                {formatDuration(playing.durationSec)} · {formatBytes(playing.sizeBytes)}
              </span>
              <button
                onClick={() => downloadVideo(playing.id)}
                className="ml-auto flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
