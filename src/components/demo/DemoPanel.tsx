import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { saveVideo } from "@/lib/videoLibraryDB";
import {
  Video, X, Minus, ChevronUp, Play, Circle, Square, Mic, MicOff,
  Library, CheckCircle, AlertCircle, Loader2, Flame, Wind,
  AlertTriangle, Wrench, MessageSquare, ClipboardCheck, FileText, Trash2,
} from "lucide-react";

// ── Demo steps ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Add Boiler Equipment", icon: <Flame className="w-3.5 h-3.5" />, route: "/equipment-library" },
  { id: 2, label: "Log Boiler Readings", icon: <Flame className="w-3.5 h-3.5" />, route: "/equipment-intelligence" },
  { id: 3, label: "Add AHU + Dirty Filter Log", icon: <Wind className="w-3.5 h-3.5" />, route: "/equipment-intelligence" },
  { id: 4, label: "Create Compliance Violation", icon: <AlertTriangle className="w-3.5 h-3.5" />, route: "/violations" },
  { id: 5, label: "Create Work Order", icon: <Wrench className="w-3.5 h-3.5" />, route: "/work-orders" },
  { id: 6, label: "Send Alert Message", icon: <MessageSquare className="w-3.5 h-3.5" />, route: "/messages" },
  { id: 7, label: "Run VVFI Assessment", icon: <ClipboardCheck className="w-3.5 h-3.5" />, route: "/facility-intelligence" },
  { id: 8, label: "Generate Audit Report", icon: <FileText className="w-3.5 h-3.5" />, route: "/compliance-analyzer" },
];

type StepStatus = "idle" | "running" | "done" | "error";

// ── Component ────────────────────────────────────────────────────────────────
export default function DemoPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [runStatuses, setRunStatuses] = useState<Record<number, StepStatus>>({});
  const [running, setRunning] = useState(false);
  const abortRef = useRef(false);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [recError, setRecError] = useState<string | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const recStartRef = useRef<number>(0);

  // Demo ids for linking steps
  const [demoIds, setDemoIds] = useState<{ boilerId?: string; ahuId?: string }>({});

  // Must be before any early return (Rules of Hooks)
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  if (user?.role !== "admin") return null;

  const facilityId = user?.facilityId || user?.["custom:facilityId"] || "facility-001";

  // ── Recording ──────────────────────────────────────────────────────────────
  async function startRecording() {
    setRecError(null);
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });

      let combined: MediaStream = displayStream;
      if (micOn) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = mic;
          combined = new MediaStream([
            ...displayStream.getVideoTracks(),
            ...displayStream.getAudioTracks(),
            ...mic.getAudioTracks(),
          ]);
        } catch (_) {
          // mic not available — continue with display only
        }
      }

      streamRef.current = displayStream;
      chunksRef.current = [];
      recStartRef.current = Date.now();

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(combined, { mimeType });
      mediaRecRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => finishRecording(mimeType);

      // Stop recording if user ends screen share via browser UI
      displayStream.getVideoTracks()[0].onended = () => stopRecording();

      recorder.start(1000);
      setRecording(true);
      setRecSec(0);
      setMinimized(true); // auto-minimize so screen is clear for recording

      timerRef.current = window.setInterval(() => {
        setRecSec((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") {
        setRecError("Could not start recording: " + (err?.message || "unknown error"));
      }
    }
  }

  function stopRecording() {
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    setMinimized(false);
  }

  async function finishRecording(mimeType: string) {
    const durationSec = (Date.now() - recStartRef.current) / 1000;

    // Stop all tracks
    streamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    micStreamRef.current = null;

    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];

    const id = `rec-${Date.now()}`;
    const title = `Training Video — ${new Date().toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    })}`;

    await saveVideo({
      id, title,
      description: "",
      blob, mimeType,
      durationSec,
      sizeBytes: blob.size,
      createdAt: new Date().toISOString(),
      tags: [],
    });

    navigate("/video-library");
  }

  // ── Demo automation ────────────────────────────────────────────────────────
  const setStatus = (id: number, s: StepStatus) =>
    setRunStatuses((prev) => ({ ...prev, [id]: s }));

  function sleep(ms: number) {
    return new Promise<void>((res, rej) => {
      const t = setTimeout(res, ms);
      const check = setInterval(() => {
        if (abortRef.current) { clearTimeout(t); clearInterval(check); rej(new Error("aborted")); }
      }, 100);
    });
  }

  async function runStep(id: number) {
    setStatus(id, "running");
    try {
      if (id === 1) {
        const res = await apiRequest<{ equipmentId?: string; id?: string }>("/equipment", {
          method: "POST",
          body: JSON.stringify({ facilityId, name: "Demo Boiler #1", type: "boiler", model: "Cleaver-Brooks CB-200", serialNumber: "DEMO-BLR-001", location: "Mechanical Room B1", status: "active", installDate: "2019-03-15", isDemo: true }),
        });
        setDemoIds((p) => ({ ...p, boilerId: res?.equipmentId || res?.id || `demo-blr-${Date.now()}` }));
      }
      if (id === 2) {
        const boilerId = demoIds.boilerId || "demo-blr-001";
        for (const r of [{ stackTemp: 540, o2Level: 2.8, efficiency: 74 }, { stackTemp: 565, o2Level: 2.5, efficiency: 71 }, { stackTemp: 591, o2Level: 2.1, efficiency: 67 }]) {
          await apiRequest("/facility-log-ingest", { method: "POST", body: JSON.stringify({ facilityId, equipmentId: boilerId, equipmentName: "Demo Boiler #1", equipmentType: "boiler", timestamp: new Date().toISOString(), ...r, notes: "Demo reading", isDemo: true }) });
          await sleep(400);
        }
      }
      if (id === 3) {
        const res = await apiRequest<{ equipmentId?: string; id?: string }>("/equipment", {
          method: "POST",
          body: JSON.stringify({ facilityId, name: "Demo AHU-3", type: "air-handler", model: "Carrier 39MN", serialNumber: "DEMO-AHU-003", location: "Rooftop Zone C", status: "active", installDate: "2021-06-01", isDemo: true }),
        });
        const ahuId = res?.equipmentId || res?.id || `demo-ahu-${Date.now()}`;
        setDemoIds((p) => ({ ...p, ahuId }));
        await apiRequest("/facility-log-ingest", { method: "POST", body: JSON.stringify({ facilityId, equipmentId: ahuId, equipmentName: "Demo AHU-3", equipmentType: "air-handler", timestamp: new Date().toISOString(), filterStatus: "dirty", efficiency: 61, notes: "Demo — filter overdue", isDemo: true }) });
      }
      if (id === 4) {
        await apiRequest("/violations", { method: "POST", body: JSON.stringify({ facilityId, type: "compliance", severity: "high", title: "Combustion Inspection Overdue", description: "Annual inspection 47 days overdue. Stack temp trending +51°F.", equipmentId: demoIds.boilerId || "demo-blr-001", equipmentName: "Demo Boiler #1", status: "open", isDemo: true }) });
      }
      if (id === 5) {
        await apiRequest("/work-orders", { method: "POST", body: JSON.stringify({ facilityId, title: "Emergency Combustion Tune-Up — Demo Boiler #1", description: "Stack temp 591°F, O₂ at 2.1%, efficiency 67%. Immediate tune-up required.", priority: "emergency", status: "open", equipmentId: demoIds.boilerId || "demo-blr-001", category: "preventive-maintenance", estimatedCost: 1200, isDemo: true }) });
      }
      if (id === 6) {
        await apiRequest("/messages", { method: "POST", body: JSON.stringify({ facilityId, subject: "⚠️ Boiler Efficiency Alert", body: "Boiler #1 stack temp rose to 591°F. Emergency work order created.", recipientType: "all-staff", priority: "urgent", isDemo: true }) });
      }
      if (id === 7) {
        await apiRequest("/vvfi", { method: "POST", body: JSON.stringify({ facilityId, assessmentType: "vvfi", overallScore: 72, sections: { combustionHealth: 58, hvacPerformance: 65, complianceStatus: 61, workOrderClosure: 80 }, notes: "Demo assessment", isDemo: true }) });
      }
      if (id === 8) {
        await apiRequest("/audit-reports", { method: "POST", body: JSON.stringify({ facilityId, reportType: "compliance-audit", title: "Monthly Compliance Audit — Demo", summary: "1 open violation, 1 emergency work order, boiler efficiency 67%.", violationCount: 1, openWorkOrders: 1, overallRiskLevel: "medium-high", isDemo: true }) });
      }
      setStatus(id, "done");
    } catch (err: any) {
      setStatus(id, "error");
      throw err;
    }
  }

  async function runAll() {
    abortRef.current = false;
    setRunning(true);
    setRunStatuses({});
    setDemoIds({});
    try {
      for (const step of STEPS) {
        if (abortRef.current) break;
        await runStep(step.id);
        navigate(step.route);
        await sleep(2500);
      }
    } catch (_) {}
    finally { setRunning(false); }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const doneCount = Object.values(runStatuses).filter((s) => s === "done").length;

  // ── Pill (minimized) ───────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-violet-700 hover:bg-violet-600 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg transition-all"
      >
        <Video className="w-3.5 h-3.5" />
        Demo Mode
        {recording && (
          <span className="flex items-center gap-1 ml-1">
            <Circle className="w-2 h-2 fill-red-400 text-red-400 animate-pulse" />
            <span className="text-red-300">{formatTime(recSec)}</span>
          </span>
        )}
      </button>
    );
  }

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-gray-900 border border-violet-500/40 text-white text-xs px-3 py-2 rounded-full shadow-lg">
        <Video className="w-3.5 h-3.5 text-violet-400" />
        {recording ? (
          <>
            <Circle className="w-2 h-2 fill-red-400 text-red-400 animate-pulse" />
            <span className="text-red-300 font-mono font-semibold">{formatTime(recSec)}</span>
            <button onClick={stopRecording} className="flex items-center gap-1 bg-red-700 hover:bg-red-800 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors">
              <Square className="w-2.5 h-2.5" /> Stop
            </button>
          </>
        ) : (
          <span className="text-violet-300 font-semibold">Demo Mode</span>
        )}
        <button onClick={() => setMinimized(false)} className="text-gray-400 hover:text-white ml-1">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { setOpen(false); setMinimized(false); }} className="text-gray-400 hover:text-red-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ── Full panel ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[370px] bg-gray-950 border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden text-white">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-900/70 to-gray-900 px-4 py-3 border-b border-violet-500/20">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-violet-200">FI Platform Demo</span>
          <span className="text-[10px] bg-violet-700/60 text-violet-300 px-1.5 py-0.5 rounded-full">ADMIN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate("/video-library")}
            title="Video Library"
            className="text-gray-400 hover:text-violet-400 transition-colors p-0.5"
          >
            <Library className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setMinimized(true)} className="text-gray-400 hover:text-white p-0.5">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-red-400 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recording control */}
      <div className="px-4 py-3 border-b border-gray-800">
        {!recording ? (
          <div className="flex items-center gap-2">
            <button
              onClick={startRecording}
              className="flex-1 flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
            >
              <Circle className="w-3 h-3 fill-white" />
              Record Screen
            </button>
            <button
              onClick={() => setMicOn((m) => !m)}
              title={micOn ? "Mic on" : "Mic off"}
              className={`p-2 rounded-lg border transition-colors ${
                micOn
                  ? "border-violet-500/50 text-violet-400 hover:bg-violet-800/30"
                  : "border-gray-700 text-gray-600 hover:text-gray-400"
              }`}
            >
              {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Circle className="w-3 h-3 fill-red-400 text-red-400 animate-pulse flex-shrink-0" />
            <span className="text-red-300 font-mono text-sm font-bold">{formatTime(recSec)}</span>
            <span className="text-[10px] text-gray-500 flex-1">Recording in progress</span>
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-red-500/40 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Square className="w-3 h-3" /> Stop & Save
            </button>
          </div>
        )}
        {recError && <p className="text-[10px] text-red-400 mt-1">{recError}</p>}
        <p className="text-[10px] text-gray-600 mt-1.5">
          Recording saves to your{" "}
          <button onClick={() => navigate("/video-library")} className="text-violet-500 hover:underline">
            Video Library
          </button>
          . Mic: {micOn ? "on" : "off"}.
        </p>
      </div>

      {/* Steps */}
      <div className="max-h-52 overflow-y-auto divide-y divide-gray-800/60">
        {STEPS.map((step) => {
          const status = runStatuses[step.id] || "idle";
          return (
            <div key={step.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-900/40 transition-colors">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {status === "idle" && <span className="text-[10px] text-gray-600 font-bold">{step.id}</span>}
                {status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />}
                {status === "done" && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                {status === "error" && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
              </div>
              <span className="text-violet-400 flex-shrink-0">{step.icon}</span>
              <span className="text-xs text-gray-300 flex-1 truncate">{step.label}</span>
              <button
                disabled={running}
                onClick={async () => {
                  setRunning(true);
                  try { await runStep(step.id); navigate(step.route); }
                  catch (_) {}
                  finally { setRunning(false); }
                }}
                className="flex-shrink-0 text-gray-600 hover:text-violet-400 disabled:opacity-30 transition-colors"
                title="Run this step"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer controls */}
      <div className="px-4 py-3 border-t border-gray-800 flex items-center gap-2 bg-gray-900/50">
        {!running ? (
          <button
            onClick={runAll}
            disabled={recording}
            className="flex-1 flex items-center justify-center gap-1.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Run Full Demo
          </button>
        ) : (
          <button
            onClick={() => { abortRef.current = true; setRunning(false); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Stop Demo
          </button>
        )}
        <button
          disabled={running || recording}
          onClick={() => { setRunStatuses({}); setDemoIds({}); }}
          className="p-2 rounded-lg border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-500/40 disabled:opacity-30 transition-colors"
          title="Reset steps"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {doneCount > 0 && (
        <div className="h-0.5 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-green-500 transition-all duration-500"
            style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
