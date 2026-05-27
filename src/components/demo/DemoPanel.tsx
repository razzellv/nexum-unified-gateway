import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import {
  Play, X, ChevronDown, ChevronUp, Minus, CheckCircle, AlertCircle, Loader2,
  Flame, Wind, AlertTriangle, Wrench, MessageSquare, ClipboardCheck, FileText,
  Trash2, Video
} from "lucide-react";

type StepStatus = "idle" | "running" | "done" | "error";

interface DemoStep {
  id: number;
  label: string;
  description: string;
  icon: React.ReactNode;
  route: string;
}

const STEPS: DemoStep[] = [
  {
    id: 1, label: "Add Boiler Equipment", icon: <Flame className="w-4 h-4" />,
    description: "Creates a commercial boiler in the Equipment Library",
    route: "/equipment-library",
  },
  {
    id: 2, label: "Log Boiler Readings", icon: <Flame className="w-4 h-4" />,
    description: "Logs 3 readings with high stack temp + low O₂ to create a trend",
    route: "/equipment-intelligence",
  },
  {
    id: 3, label: "Add AHU + Log Dirty Filter", icon: <Wind className="w-4 h-4" />,
    description: "Creates an Air Handler Unit and logs a dirty filter reading",
    route: "/equipment-intelligence",
  },
  {
    id: 4, label: "Create Compliance Violation", icon: <AlertTriangle className="w-4 h-4" />,
    description: "Logs a combustion inspection overdue violation",
    route: "/violations",
  },
  {
    id: 5, label: "Create Work Order", icon: <Wrench className="w-4 h-4" />,
    description: "Emergency tune-up work order linked to the boiler",
    route: "/work-orders",
  },
  {
    id: 6, label: "Send Alert Message", icon: <MessageSquare className="w-4 h-4" />,
    description: "Sends a facility-wide alert about the boiler issue",
    route: "/messages",
  },
  {
    id: 7, label: "Run VVFI Assessment", icon: <ClipboardCheck className="w-4 h-4" />,
    description: "Submits a VVFI / facility intelligence assessment",
    route: "/facility-intelligence",
  },
  {
    id: 8, label: "Generate Audit Report", icon: <FileText className="w-4 h-4" />,
    description: "Creates a compliance audit report snapshot",
    route: "/compliance-analyzer",
  },
];

const DELAY_MS = 2500;

export default function DemoPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [running, setRunning] = useState(false);
  const [statuses, setStatuses] = useState<Record<number, StepStatus>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [log, setLog] = useState<string[]>([]);
  const [demoIds, setDemoIds] = useState<{ boilerId?: string; ahuId?: string }>({});
  const abortRef = useRef(false);

  if (user?.role !== "admin") return null;

  const setStatus = (id: number, s: StepStatus) =>
    setStatuses((prev) => ({ ...prev, [id]: s }));

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const sleep = (ms: number) =>
    new Promise<void>((res, rej) => {
      const t = setTimeout(res, ms);
      const check = setInterval(() => {
        if (abortRef.current) { clearTimeout(t); clearInterval(check); rej(new Error("aborted")); }
      }, 100);
    });

  const facilityId = user?.facilityId || user?.["custom:facilityId"] || "facility-001";

  async function runStep(step: number) {
    setStatus(step, "running");
    try {
      if (step === 1) {
        const res = await apiRequest<{ equipmentId?: string; id?: string }>("/equipment", {
          method: "POST",
          body: JSON.stringify({
            facilityId,
            name: "Demo Boiler #1",
            type: "boiler",
            model: "Cleaver-Brooks CB-200",
            serialNumber: "DEMO-BLR-001",
            location: "Mechanical Room B1",
            status: "active",
            installDate: "2019-03-15",
            isDemo: true,
          }),
        });
        const boilerId = res?.equipmentId || res?.id || `demo-blr-${Date.now()}`;
        setDemoIds((prev) => ({ ...prev, boilerId }));
        addLog(`Boiler created: ${boilerId}`);
      }

      if (step === 2) {
        const boilerId = demoIds.boilerId || "demo-blr-001";
        const readings = [
          { stackTemp: 540, o2Level: 2.8, efficiency: 74, co2: 12.1 },
          { stackTemp: 565, o2Level: 2.5, efficiency: 71, co2: 12.8 },
          { stackTemp: 591, o2Level: 2.1, efficiency: 67, co2: 13.5 },
        ];
        for (const r of readings) {
          await apiRequest("/facility-log-ingest", {
            method: "POST",
            body: JSON.stringify({
              facilityId,
              equipmentId: boilerId,
              equipmentName: "Demo Boiler #1",
              equipmentType: "boiler",
              timestamp: new Date().toISOString(),
              stackTemp: r.stackTemp,
              o2Level: r.o2Level,
              efficiency: r.efficiency,
              co2: r.co2,
              notes: "Demo reading — combustion trending inefficient",
              isDemo: true,
            }),
          });
          await sleep(400);
        }
        addLog("Boiler: 3 trend readings logged");
      }

      if (step === 3) {
        const ahuRes = await apiRequest<{ equipmentId?: string; id?: string }>("/equipment", {
          method: "POST",
          body: JSON.stringify({
            facilityId,
            name: "Demo AHU-3",
            type: "air-handler",
            model: "Carrier 39MN",
            serialNumber: "DEMO-AHU-003",
            location: "Rooftop — Zone C",
            status: "active",
            installDate: "2021-06-01",
            isDemo: true,
          }),
        });
        const ahuId = ahuRes?.equipmentId || ahuRes?.id || `demo-ahu-${Date.now()}`;
        setDemoIds((prev) => ({ ...prev, ahuId }));
        await apiRequest("/facility-log-ingest", {
          method: "POST",
          body: JSON.stringify({
            facilityId,
            equipmentId: ahuId,
            equipmentName: "Demo AHU-3",
            equipmentType: "air-handler",
            timestamp: new Date().toISOString(),
            filterStatus: "dirty",
            efficiency: 61,
            notes: "Demo reading — filter replacement overdue 6 weeks",
            isDemo: true,
          }),
        });
        addLog(`AHU created: ${ahuId}, dirty filter reading logged`);
      }

      if (step === 4) {
        await apiRequest("/violations", {
          method: "POST",
          body: JSON.stringify({
            facilityId,
            type: "compliance",
            severity: "high",
            title: "Combustion Inspection Overdue",
            description:
              "Annual combustion inspection for Demo Boiler #1 is 47 days overdue. " +
              "Stack temp trending +51°F over 3 readings.",
            equipmentId: demoIds.boilerId || "demo-blr-001",
            equipmentName: "Demo Boiler #1",
            dueDate: new Date(Date.now() - 47 * 864e5).toISOString().split("T")[0],
            status: "open",
            isDemo: true,
          }),
        });
        addLog("Violation logged: combustion inspection overdue");
      }

      if (step === 5) {
        await apiRequest("/work-orders", {
          method: "POST",
          body: JSON.stringify({
            facilityId,
            title: "Emergency Combustion Tune-Up — Demo Boiler #1",
            description:
              "Stack temp at 591°F (+51°F over baseline). O₂ at 2.1% (below safe 3%). " +
              "Combustion efficiency dropped to 67%. Immediate tune-up required.",
            priority: "emergency",
            status: "open",
            equipmentId: demoIds.boilerId || "demo-blr-001",
            equipmentName: "Demo Boiler #1",
            category: "preventive-maintenance",
            assignedTo: "Facilities Team",
            dueDate: new Date(Date.now() + 864e5).toISOString().split("T")[0],
            estimatedCost: 1200,
            isDemo: true,
          }),
        });
        addLog("Work order created: emergency tune-up");
      }

      if (step === 6) {
        await apiRequest("/messages", {
          method: "POST",
          body: JSON.stringify({
            facilityId,
            subject: "⚠️ Boiler Efficiency Alert — Immediate Attention Required",
            body:
              "Boiler #1 stack temperature has risen to 591°F (+51°F) over the last 3 readings. " +
              "O₂ levels are below the 3% safety threshold. An emergency work order has been created. " +
              "Please coordinate with facilities for an immediate tune-up.",
            recipientType: "all-staff",
            priority: "urgent",
            channel: "in-app",
            isDemo: true,
          }),
        });
        addLog("Alert message sent to all staff");
      }

      if (step === 7) {
        await apiRequest("/vvfi", {
          method: "POST",
          body: JSON.stringify({
            facilityId,
            assessmentType: "vvfi",
            overallScore: 72,
            sections: {
              combustionHealth: 58,
              hvacPerformance: 65,
              complianceStatus: 61,
              workOrderClosure: 80,
            },
            notes: "Demo VVFI assessment — combustion and compliance sections flagged for review",
            isDemo: true,
          }),
        });
        addLog("VVFI assessment submitted");
      }

      if (step === 8) {
        await apiRequest("/audit-reports", {
          method: "POST",
          body: JSON.stringify({
            facilityId,
            reportType: "compliance-audit",
            title: "Monthly Compliance Audit — Demo Run",
            summary:
              "1 open violation (combustion inspection overdue). 1 emergency work order. " +
              "Boiler combustion efficiency at 67% — below 80% threshold. " +
              "Recommended action: immediate tune-up and re-inspection within 30 days.",
            violationCount: 1,
            openWorkOrders: 1,
            overallRiskLevel: "medium-high",
            isDemo: true,
          }),
        });
        addLog("Audit report generated");
      }

      setStatus(step, "done");
    } catch (err: any) {
      const msg = err?.message || String(err);
      setStatus(step, "error");
      setErrors((prev) => ({ ...prev, [step]: msg }));
      addLog(`Step ${step} error: ${msg}`);
      throw err;
    }
  }

  async function runAll() {
    abortRef.current = false;
    setRunning(true);
    setStatuses({});
    setErrors({});
    setLog([]);
    setDemoIds({});
    try {
      for (const step of STEPS) {
        if (abortRef.current) break;
        await runStep(step.id);
        navigate(step.route);
        await sleep(DELAY_MS);
      }
    } catch (_) {
      // step errors already recorded
    } finally {
      setRunning(false);
    }
  }

  async function runSingle(id: number) {
    abortRef.current = false;
    setRunning(true);
    try {
      await runStep(id);
      navigate(STEPS[id - 1].route);
    } finally {
      setRunning(false);
    }
  }

  function stopDemo() {
    abortRef.current = true;
    setRunning(false);
  }

  async function clearDemo() {
    addLog("Clearing demo data flags from localStorage…");
    localStorage.removeItem("demo_boiler_id");
    localStorage.removeItem("demo_ahu_id");
    setStatuses({});
    setErrors({});
    setLog(["Demo state cleared."]);
    setDemoIds({});
  }

  const doneCount = Object.values(statuses).filter((s) => s === "done").length;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg transition-all"
      >
        <Video className="w-3.5 h-3.5" />
        Demo Mode
      </button>
    );
  }

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-gray-900 border border-violet-500/50 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg">
        <Video className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-violet-300">Demo Mode</span>
        {running && <Loader2 className="w-3 h-3 animate-spin text-violet-300" />}
        {!running && doneCount > 0 && (
          <span className="text-green-400">{doneCount}/{STEPS.length}</span>
        )}
        <button onClick={() => setMinimized(false)} className="hover:text-white text-gray-400 ml-1">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { setOpen(false); setMinimized(false); }} className="hover:text-red-400 text-gray-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] bg-gray-950 border border-violet-500/40 rounded-xl shadow-2xl text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-900/80 to-gray-900 px-4 py-3 border-b border-violet-500/30">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-violet-200">FI Platform Demo Mode</span>
          <span className="text-[10px] bg-violet-700/60 text-violet-300 px-1.5 py-0.5 rounded-full">ADMIN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMinimized(true)} className="text-gray-400 hover:text-white p-0.5">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-red-400 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-800">
        {STEPS.map((step) => {
          const status = statuses[step.id] || "idle";
          return (
            <div key={step.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-900/50 transition-colors">
              {/* Status icon */}
              <div className="mt-0.5 flex-shrink-0">
                {status === "idle" && (
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-700 text-[10px] text-gray-400 font-bold">
                    {step.id}
                  </span>
                )}
                {status === "running" && <Loader2 className="w-5 h-5 animate-spin text-violet-400" />}
                {status === "done" && <CheckCircle className="w-5 h-5 text-green-400" />}
                {status === "error" && <AlertCircle className="w-5 h-5 text-red-400" />}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-violet-400">{step.icon}</span>
                  <span className="text-xs font-medium text-gray-200 truncate">{step.label}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{step.description}</p>
                {status === "error" && errors[step.id] && (
                  <p className="text-[10px] text-red-400 mt-0.5 truncate" title={errors[step.id]}>
                    {errors[step.id]}
                  </p>
                )}
              </div>

              {/* Run single */}
              <button
                disabled={running}
                onClick={() => runSingle(step.id)}
                className="flex-shrink-0 text-gray-600 hover:text-violet-400 disabled:opacity-30 mt-0.5 transition-colors"
                title="Run this step only"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-black/40 px-4 py-2 max-h-24 overflow-y-auto border-t border-gray-800">
          {log.map((line, i) => (
            <p key={i} className="text-[10px] text-gray-400 font-mono leading-relaxed">{line}</p>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-800 bg-gray-900/60">
        {!running ? (
          <button
            onClick={runAll}
            className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Run Full Demo
          </button>
        ) : (
          <button
            onClick={stopDemo}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Stop
          </button>
        )}
        <button
          disabled={running}
          onClick={clearDemo}
          title="Clear demo state"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 disabled:opacity-30 py-2 px-2 rounded-lg border border-gray-700 hover:border-red-500/50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress */}
      {doneCount > 0 && (
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-green-500 transition-all duration-500"
            style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
