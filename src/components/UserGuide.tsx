import React from "react";
import { X, BookOpen, MessageSquare, Terminal, Layers, ShieldCheck, Zap } from "lucide-react";
import { motion } from "motion/react";

interface UserGuideProps {
  onClose: () => void;
}

export default function UserGuide({ onClose }: UserGuideProps) {
  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-[#D1D5DB] font-sans">
      <header className="p-6 border-b border-[#1F1F1F] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen className="text-emerald-500" size={24} />
          <h2 className="text-lg font-bold text-white tracking-tight">User Guide</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-[#444] hover:text-white transition-colors rounded-full hover:bg-[#1A1A1A]"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#444]">
            <Zap size={14} />
            <span>Getting Started</span>
          </div>
          <p className="text-sm leading-relaxed text-[#888]">
            CCC AI Workspace is a local-first environment that uses <span className="text-white font-medium italic">Code Context Compiler</span> to give Gemini models a deterministic understanding of your project.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#444]">
            <Layers size={14} />
            <span>Core Workflows</span>
          </div>
          
          <div className="grid gap-4">
            <div className="p-4 bg-[#111] border border-[#1F1F1F] rounded-xl hover:border-[#333] transition-colors group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                  <MessageSquare size={16} />
                </div>
                <h4 className="text-sm font-bold text-white">Repository Queries & Memory</h4>
              </div>
              <p className="text-xs text-[#666] leading-relaxed">
                Ask questions about your code. Use persistent memory to store key facts about the codebase using keywords like "Remember that..." or "Search memory for...".
              </p>
            </div>

            <div className="p-4 bg-[#111] border border-[#1F1F1F] rounded-xl hover:border-[#333] transition-colors group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-900/30 flex items-center justify-center text-indigo-400">
                  <Terminal size={16} />
                </div>
                <h4 className="text-sm font-bold text-white">Task-Driven Engineering</h4>
              </div>
              <p className="text-xs text-[#666] leading-relaxed">
                The agent can create and track complex tasks in the side panel. It uses a "Plan &rarr; Execute &rarr; Validate" loop to ensure high-quality changes.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#444]">
            <ShieldCheck size={14} />
            <span>Safety & Controls</span>
          </div>
          <div className="bg-[#050505] border border-[#1A1A1A] p-4 rounded-xl space-y-3">
            <p className="text-xs text-[#888] leading-relaxed">
              We prioritize user control over autonomous execution:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-[11px]">
                <span className="text-emerald-500 font-bold">•</span>
                <span className="text-[#666]">File writes require manual <span className="text-[#AAA] font-bold">Approve</span> action.</span>
              </li>
              <li className="flex items-start gap-2 text-[11px]">
                <span className="text-emerald-500 font-bold">•</span>
                <span className="text-[#666]">Destructive shell commands are restricted to a safe sandbox.</span>
              </li>
              <li className="flex items-start gap-2 text-[11px]">
                <span className="text-emerald-500 font-bold">•</span>
                <span className="text-[#666]">Deterministic context prevents LLM hallucinations about code.</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-4 pb-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#444]">
            <BookOpen size={14} />
            <span>Shortcuts</span>
          </div>
          <div className="font-mono text-[10px] space-y-2">
            <div className="flex justify-between items-center p-2 rounded bg-[#111] border border-[#1F1F1F]">
              <span className="text-[#555]">Open Sidebar</span>
              <kbd className="px-1.5 py-0.5 bg-[#1F1F1F] rounded text-[#888]">⌘ + B</kbd>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-[#111] border border-[#1F1F1F]">
              <span className="text-[#555]">Context Panel</span>
              <kbd className="px-1.5 py-0.5 bg-[#1F1F1F] rounded text-[#888]">⌘ + J</kbd>
            </div>
          </div>
        </section>
      </div>
      
      <footer className="p-6 border-t border-[#1F1F1F] bg-[#080808] text-center">
        <p className="text-[10px] text-[#444] uppercase tracking-widest font-black">
          Architected for high-fidelity code generation
        </p>
      </footer>
    </div>
  );
}
