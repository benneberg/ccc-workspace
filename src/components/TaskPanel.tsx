import React from "react";
import { CheckCircle2, Clock, Play, AlertCircle, Terminal, FileText } from "lucide-react";

export interface TaskStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
  description?: string;
  tool?: string;
}

interface TaskPanelProps {
  title: string;
  steps: TaskStep[];
  onAction?: (action: string) => void;
}

export default function TaskPanel({ title, steps, onAction }: TaskPanelProps) {
  const activeStep = steps.find(s => s.status === "active");

  return (
    <div className="bg-[#111] p-5 rounded-xl border border-[#222] shadow-xl shadow-black/50 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-tight">{title}</h3>
        <span className="text-[10px] text-[#444] font-mono">
          {steps.filter(s => s.status === "done").length}/{steps.length}
        </span>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.id} className="relative pl-6">
            {/* Connection Line */}
            <div className="absolute left-[7px] top-4 bottom-[-16px] w-[2px] bg-[#1A1A1A] last:hidden" />
            
            {/* Status Dot */}
            <div className={`absolute left-0 top-1 w-4 h-4 rounded-full flex items-center justify-center z-10 ${
              step.status === "done" ? "bg-emerald-500/20 text-emerald-500" :
              step.status === "active" ? "bg-amber-500/20 text-amber-500" :
              step.status === "error" ? "bg-red-500/20 text-red-500" :
              "bg-neutral-800 text-neutral-600"
            }`}>
              {step.status === "done" ? <CheckCircle2 size={12} /> :
               step.status === "active" ? <Play size={10} className="fill-current animate-pulse" /> :
               step.status === "error" ? <AlertCircle size={10} /> :
               <Clock size={10} />}
            </div>

            <div className="flex flex-col gap-1">
              <span className={`text-[11px] font-bold ${
                step.status === "active" ? "text-white" : 
                step.status === "done" ? "text-emerald-500/80" : "text-[#444]"
              }`}>
                {step.label}
              </span>
              {step.description && (
                <p className="text-[10px] text-[#555] leading-relaxed italic">
                  {step.description}
                </p>
              )}
              {step.status === "active" && step.tool && (
                <div className="mt-2 p-2 bg-[#050505] border border-[#1F1F1F] rounded font-mono text-[9px] text-amber-400 flex items-center gap-2">
                  <Terminal size={10} />
                  <span>Executing: {step.tool}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {activeStep?.status === "active" && (
        <div className="pt-4 border-t border-[#1F1F1F] flex gap-2">
          <button 
            onClick={() => onAction?.("pause")}
            className="flex-1 py-2 bg-[#1A1A1A] text-[10px] uppercase font-bold text-[#666] rounded hover:text-white transition-colors"
          >
            Pause
          </button>
          <button 
            onClick={() => onAction?.("cancel")}
            className="flex-1 py-2 bg-red-950/20 text-[10px] uppercase font-bold text-red-900 rounded hover:bg-red-900 hover:text-white transition-colors"
          >
            Abort
          </button>
        </div>
      )}
    </div>
  );
}
