import React, { useState, useEffect } from "react";
import { Brain, Search, Tag, Clock, RefreshCw } from "lucide-react";

interface MemoryEntry {
  id: string;
  repo: string;
  content: string;
  tags: string[];
  lastUsed: string;
}

interface MemoryInspectorProps {
  currentRepo: string;
}

export const MemoryInspector: React.FC<MemoryInspectorProps> = ({ currentRepo }) => {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMemories = async (searchQuery: string = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memory?repository=${encodeURIComponent(currentRepo)}&query=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(Array.isArray(data) ? data : data.memories || []);
      }
    } catch (e) {
      console.error("Failed to fetch memories", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories(query);
  }, [currentRepo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories(query);
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
          <Brain size={16} />
          <span>Repository Memory ({currentRepo})</span>
        </div>
        <button
          onClick={() => fetchMemories(query)}
          className="p-1 text-[#666] hover:text-white transition-colors"
          title="Refresh memory index"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <form onSubmit={handleSearch} className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-2.5 text-[#555]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search architectural tags or memory content..."
            className="w-full bg-[#080808] border border-[#222] rounded-lg pl-8 pr-3 py-1.5 text-[#EEE] placeholder-[#444] focus:outline-none focus:border-emerald-500/50 text-[11px]"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-emerald-600 hover:text-black text-white font-semibold rounded-lg text-[10px] transition-colors"
        >
          Search
        </button>
      </form>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {memories.length === 0 ? (
          <p className="text-[#555] italic text-center py-4">No memory entries found for this repository.</p>
        ) : (
          memories.map((entry) => (
            <div key={entry.id} className="p-2.5 bg-[#080808] border border-[#1F1F1F] rounded-lg space-y-1.5">
              <p className="text-[#DDD] font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{entry.content}</p>
              <div className="flex items-center justify-between pt-1 text-[10px] text-[#666]">
                <div className="flex items-center gap-1 flex-wrap">
                  <Tag size={10} className="text-emerald-500" />
                  {entry.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-[#888]">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-[#444]">
                  <Clock size={10} />
                  <span>{new Date(entry.lastUsed).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
