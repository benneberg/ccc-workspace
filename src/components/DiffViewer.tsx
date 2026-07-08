import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, X, FileEdit } from "lucide-react";

interface DiffViewerProps {
  fileName: string;
  oldCode: string;
  newCode: string;
  onApprove?: () => void;
  onReject?: () => void;
}

export default function DiffViewer({ fileName, oldCode, newCode, onApprove, onReject }: DiffViewerProps) {
  return (
    <div className="flex flex-col bg-[#050505] border border-[#1F1F1F] rounded-2xl overflow-hidden shadow-2xl">
      <header className="px-4 py-3 border-b border-[#1F1F1F] bg-[#0A0A0A] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileEdit size={14} className="text-[#444]" />
          <span className="text-xs font-mono text-[#AAA]">{fileName}</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onReject}
            className="p-1.5 rounded-lg bg-[#1A1A1A] text-red-500 hover:bg-red-950/20 transition-all border border-transparent hover:border-red-900/30"
          >
            <X size={14} />
          </button>
          <button 
            onClick={onApprove}
            className="p-1.5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 transition-all"
          >
            <Check size={14} />
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#1F1F1F] max-h-[400px] overflow-hidden group">
        <div className="flex flex-col bg-red-950/5 relative">
          <div className="absolute top-2 right-4 text-[9px] font-mono text-red-900 uppercase font-bold px-1 rounded border border-red-900/20">Original</div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <SyntaxHighlighter
              language="typescript"
              style={vscDarkPlus}
              customStyle={{ background: "transparent", margin: 0, padding: "1.5rem", fontSize: "11px" }}
            >
              {oldCode}
            </SyntaxHighlighter>
          </div>
        </div>
        <div className="flex flex-col bg-emerald-950/5 relative">
          <div className="absolute top-2 right-4 text-[9px] font-mono text-emerald-500 uppercase font-bold px-1 rounded border border-emerald-500/20">Changes</div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <SyntaxHighlighter
              language="typescript"
              style={vscDarkPlus}
              customStyle={{ background: "transparent", margin: 0, padding: "1.5rem", fontSize: "11px" }}
            >
              {newCode}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
      
      <footer className="p-3 bg-[#080808] border-t border-[#1F1F1F] flex items-center justify-between">
        <p className="text-[10px] text-[#444] uppercase tracking-widest font-mono">Pending Review</p>
        <div className="flex items-center gap-4">
          <button className="text-[10px] text-[#666] hover:text-white transition-colors uppercase font-bold">Discard All</button>
          <button 
            onClick={onApprove}
            className="text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors uppercase font-black tracking-widest"
          >
            Apply Patch
          </button>
        </div>
      </footer>
    </div>
  );
}
