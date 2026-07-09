import { useState, useEffect, useRef } from "react";
import { MessageSquare, Code, Terminal, Layers, Send, Menu, X, ChevronRight, Github, FolderOpen, Save, RefreshCw, BookOpen, Info, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import UserGuide from "./components/UserGuide";
import TaskPanel, { TaskStep } from "./components/TaskPanel";
import DiffViewer from "./components/DiffViewer";

interface MessageBlock {
  type: "text" | "diff" | "task" | "tool";
  content: any;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  blocks?: MessageBlock[];
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hello! I'm your CCC AI Workspace assistant. Connect a repository to get started." }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeMobileView, setActiveMobileView] = useState<"repository" | "chat" | "context">("chat");
  
  const [repos, setRepos] = useState<{name: string, path: string}[]>([]);
  const [currentRepo, setCurrentRepo] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<any>(null);
  const [isCloning, setIsCloning] = useState(false);

  const [activeTask, setActiveTask] = useState<{title: string, steps: TaskStep[]} | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<{ id: string, filePath: string, content: string, reason: string }[]>([]);

  const handleApproveWrite = (id: string, approved: boolean) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "approve_write", id, approved }));
      setPendingApprovals(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleDeleteRepo = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await fetch(`/api/repos/${name}`, { method: "DELETE" });
      setRepos(prev => prev.filter(r => r.name !== name));
      if (currentRepo === name) setCurrentRepo(null);
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const [isConnected, setIsConnected] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchRepos = async () => {
    try {
      const res = await fetch("/api/repos");
      const data = await res.json();
      setRepos(data);
      if (data.length > 0 && !currentRepo) {
        setCurrentRepo(data[0].name);
      }
    } catch (e) {
      console.error("Failed to fetch repos", e);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/user");
      if (res.ok) {
        const data = await res.json();
        setGithubUser(data);
      }
    } catch (e) {
      setGithubUser(null);
    }
  };

  useEffect(() => {
    fetchRepos();
    fetchUser();
    
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchUser();
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const handleConnectGithub = async () => {
    const res = await fetch("/api/auth/url");
    const { url } = await res.json();
    window.open(url, "github_auth", "width=600,height=700");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/repos/upload", {
        method: "POST",
        body: formData,
      });
      const newRepo = await res.json();
      setRepos(prev => [...prev, newRepo]);
      setCurrentRepo(newRepo.name);
    } catch (e) {
      console.error("Upload failed", e);
    }
  };

  const handleCloneRepo = async () => {
    const url = prompt("Enter GitHub Repository URL (e.g., https://github.com/owner/repo):");
    if (!url) return;

    setIsCloning(true);
    try {
      const res = await fetch("/api/repos/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const newRepo = await res.json();
        setRepos(prev => [...prev, newRepo]);
        setCurrentRepo(newRepo.name);
      } else {
        const err = await res.text();
        alert(`Clone failed: ${err}`);
      }
    } catch (e) {
      console.error("Clone failed", e);
    } finally {
      setIsCloning(false);
    }
  };

  const [toolResultResolvers] = useState<Map<string, (result: any) => void>>(new Map());

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}`);

    socket.onopen = () => {
      setIsConnected(true);
      console.log("Connected to server");
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log("Disconnected from server");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "stream_start") {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "", blocks: [] }]);
        setIsAiLoading(true);
      } else if (data.type === "stream_token") {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: last.content + data.token }];
          }
          return prev;
        });
      } else if (data.type === "stream_end") {
        setIsAiLoading(false);
      } else if (data.type === "tool_call") {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant") {
            const blocks = last.blocks || [];
            return [...prev.slice(0, -1), { 
              ...last, 
              blocks: [...blocks, { type: "tool", content: { name: data.name, args: data.args, status: "executing" } }] 
            }];
          }
          return prev;
        });
      } else if (data.type === "tool_result") {
        if (data.name === "createTask" && data.result.success) {
          setActiveTask({
            title: data.result.title,
            steps: [{ id: "1", label: data.result.goal, status: "pending" }]
          });
          setIsContextOpen(true);
        } else if (data.name === "updateTaskStatus" && data.result.success) {
          setActiveTask(prev => {
            if (!prev) return null;
            return {
              ...prev,
              steps: prev.steps.map(s => ({ ...s, status: data.result.status as any }))
            };
          });
        }

        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant") {
            const blocks = (last.blocks || []).map(b => {
              if (b.type === "tool" && b.content.name === data.name && b.content.status === "executing") {
                return { ...b, content: { ...b.content, result: data.result, status: "done" } };
              }
              return b;
            });
            
            // Auto-detect diffs from writeFile or search results that look like code
            const extraBlocks: MessageBlock[] = [];
            if (data.name === "writeFile") {
              // We could add a diff block here if we had the original content
            }

            return [...prev.slice(0, -1), { ...last, blocks: [...blocks, ...extraBlocks] }];
          }
          return prev;
        });
      } else if (data.type === "pending_approval") {
        setPendingApprovals(prev => [...prev, {
          id: data.id,
          filePath: data.filePath,
          content: data.content,
          reason: data.reason
        }]);
      } else if (data.type === "error") {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "system", content: `Error: ${data.message}` }]);
        setIsAiLoading(false);
      } else if (data.type === "tool_response") {
        const resolver = toolResultResolvers.get(data.id);
        if (resolver) {
          resolver(data.result);
          toolResultResolvers.delete(data.id);
        }
      }
    };

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, [toolResultResolvers]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const runChat = (message: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: message }]);

    socketRef.current.send(JSON.stringify({
      type: "chat",
      message,
      history: messages.filter(m => m.role !== 'system').slice(-10).map(m => ({
        role: m.role,
        content: m.content
      })),
      currentRepo
    }));
  };

  const handleSend = () => {
    if (!inputValue.trim() || isAiLoading) return;
    runChat(inputValue);
    setInputValue("");
  };

  return (
    <div className="flex h-screen bg-[#050505] text-[#D1D5DB] font-sans selection:bg-emerald-500/30 overflow-hidden relative">
      {/* Mobile Overlays */}
      <AnimatePresence>
        {(isSidebarOpen || isContextOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setIsSidebarOpen(false); setIsContextOpen(false); }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Left Sidebar (Repository/Skills) */}
      <AnimatePresence mode="wait">
        {(isSidebarOpen || !window.matchMedia("(max-width: 1024px)").matches) && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            className={`fixed lg:relative inset-y-0 left-0 w-72 lg:w-64 border-r border-[#1F1F1F] bg-[#0A0A0A] flex flex-col z-50 lg:z-20 shrink-0 transition-all shadow-2xl lg:shadow-none`}
          >
            <div className="p-6 border-b border-[#1F1F1F] flex items-center justify-between">
              <div>
                <h1 className="text-[10px] tracking-[0.2em] uppercase text-[#666] font-bold mb-1">CCC Workspace</h1>
                <p className="text-sm font-serif italic text-white flex items-center gap-2">
                  Local Runtime <span className="text-[10px] bg-[#1A1A1A] px-1 rounded not-italic font-mono text-[#AAA]">v0.1.2</span>
                </p>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-2 text-[#444] hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <nav className="flex-1 py-4 px-3 space-y-8 overflow-y-auto">
              <section>
                <header className="px-3 mb-3 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-[#444] font-bold">Repositories</p>
                  <label className="cursor-pointer hover:text-white text-[#444] transition-colors">
                    <Plus size={12} />
                    <input type="file" className="hidden" accept=".zip" onChange={handleFileUpload} />
                  </label>
                </header>
                <div className="space-y-1">
                  {repos.length === 0 && (
                    <p className="px-3 text-[10px] text-[#333] italic">No repos mounted</p>
                  )}
                  {repos.map(repo => (
                    <div
                      key={repo.name}
                      onClick={() => setCurrentRepo(repo.name)}
                      className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all border cursor-pointer ${
                        currentRepo === repo.name 
                          ? 'bg-[#161616] text-white border-[#333] shadow-sm shadow-black' 
                          : 'text-[#666] hover:text-[#bbb] border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentRepo === repo.name ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[#333]'}`}></div>
                        <span className="font-mono truncate">{repo.name}</span>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteRepo(repo.name, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {githubUser ? (
                    <button 
                      onClick={handleCloneRepo}
                      disabled={isCloning}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-[#444] hover:text-[#bbb] transition-all group"
                    >
                      <Github size={14} className="group-hover:text-white" />
                      <span className="font-mono truncate">{isCloning ? "Cloning..." : "Clone from GitHub"}</span>
                    </button>
                  ) : (
                    <button 
                      onClick={handleConnectGithub}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-[#444] hover:text-white transition-all group"
                    >
                      <Github size={14} />
                      <span className="font-mono truncate">Connect GitHub</span>
                    </button>
                  )}
                </div>
              </section>

              <section>
                <header className="px-3 mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#444] font-bold">Persistent Memory</p>
                </header>
                <ul className="space-y-3 text-[11px] px-3 text-[#777]">
                  <li className="flex justify-between items-center group">
                    <span className="group-hover:text-[#AAA] transition-colors">Auth Flow</span>
                    <span className="font-mono text-[#444]">80%</span>
                  </li>
                  <li className="flex justify-between items-center group">
                    <span className="group-hover:text-[#AAA] transition-colors text-white">MQTT Logic</span>
                    <span className="font-mono text-emerald-500 font-bold uppercase tracking-tighter">NEW</span>
                  </li>
                  <li className="flex justify-between items-center group">
                    <span className="group-hover:text-[#AAA] transition-colors underline decoration-[#333]">Refactor Stats</span>
                    <span className="font-mono text-[#444]">md</span>
                  </li>
                </ul>
              </section>

              <section>
                <header className="px-3 mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#444] font-bold">Skills</p>
                </header>
                <div className="grid grid-cols-2 gap-2 px-1">
                  {['Refactor', 'Testing', 'Architect', 'Review'].map(skill => (
                    <button 
                      key={skill}
                      className={`p-2 text-[10px] bg-[#111] border border-[#222] text-center rounded hover:border-[#444] hover:text-white transition-all ${
                        skill === 'Review' ? 'text-emerald-400 border-emerald-900/30' : 'text-[#666]'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </section>

              <section className="pt-4">
                <button 
                  onClick={() => setIsGuideOpen(true)}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-[#111] border border-[#1A1A1A] hover:border-[#333] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#050505] border border-[#1A1A1A] flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <BookOpen size={16} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#777] group-hover:text-white">User Guide</span>
                  </div>
                  <ChevronRight size={14} className="text-[#333] group-hover:text-emerald-500 transition-colors" />
                </button>
              </section>
            </nav>

            <div className="p-6 border-t border-[#1F1F1F]">
              <div className="flex items-center justify-between text-[10px] text-[#444]">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                  <span>SQLite {isConnected ? 'Ready' : 'Offline'}</span>
                </div>
                <span className="font-mono">{isConnected ? '0.4ms' : '---'}</span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-brand-bg relative min-w-0 pb-[72px] lg:pb-0">
        {/* Top Header */}
        <header className="h-14 lg:h-16 border-b border-[#1F1F1F] flex items-center justify-between px-4 lg:px-6 bg-[#080808] shrink-0 z-10 sticky top-0">
          <div className="flex items-center space-x-3 lg:space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-[#444] hover:text-white transition-colors lg:hidden"
            >
              <Menu size={20} />
            </button>
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="hidden lg:block p-1 text-[#444] hover:text-white transition-colors"
                id="sidebar-toggle-open"
              >
                <Menu size={18} />
              </button>
            )}
            <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3">
              <span className="text-xs font-bold text-white truncate max-w-[120px] lg:max-w-none">{currentRepo}</span>
              <div className="flex items-center gap-2">
                <div className="hidden lg:block px-2 py-0.5 bg-[#1A1A1A] border border-[#333] rounded text-[10px] text-[#AAA] font-mono">
                  gemini-1.5-pro
                </div>
                <span className="text-[9px] lg:text-[11px] text-[#555] font-medium uppercase tracking-[0.1em] lg:tracking-[0.2em] whitespace-nowrap">Reasoning Mode</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-3">
            <button 
              onClick={() => pendingApprovals.length > 0 && handleApproveWrite(pendingApprovals[0].id, true)}
              disabled={pendingApprovals.length === 0}
              className={`px-3 py-1.5 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                pendingApprovals.length > 0 
                  ? 'bg-amber-500 text-black hover:bg-amber-400 animate-pulse cursor-pointer' 
                  : 'bg-[#1F1F1F] text-[#444] cursor-not-allowed'
              }`}
            >
              {pendingApprovals.length > 0 ? `Approve (${pendingApprovals.length})` : 'Approve'}
            </button>
            <button 
              onClick={() => setIsContextOpen(!isContextOpen)}
              className={`p-1.5 rounded-md transition-colors ${isContextOpen ? 'bg-[#1A1A1A] text-white' : 'text-[#444] hover:text-white'}`}
            >
              <Layers size={18} className="lg:w-4 lg:h-4" />
            </button>
          </div>
        </header>

        {/* Desktop View Switch (Tab style for mobile behavior if needed) */}
        <div className="lg:hidden flex border-b border-[#1F1F1F] bg-[#050505]">
          {(["chat", "context"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveMobileView(view)}
              className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-bold transition-all border-b-2 ${
                activeMobileView === view ? 'text-white border-emerald-500' : 'text-[#444] border-transparent'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Chat / Viewport */}
        <div 
          ref={scrollRef}
          className={`flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto scroll-smooth flex flex-col space-y-8 ${activeMobileView !== 'chat' ? 'hidden lg:flex' : 'flex'}`}
        >
          <div className="max-w-3xl mx-auto w-full space-y-8">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`flex space-x-3 lg:space-x-4 group ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded flex items-center justify-center text-[10px] shrink-0 font-bold ${
                  message.role === 'user' ? 'bg-[#222] text-[#AAA]' : 'bg-emerald-900/40 text-emerald-400 border border-emerald-900/50'
                }`}>
                  {message.role === 'user' ? 'U' : 'M'}
                </div>
                <div className={`flex flex-col gap-2 flex-1 max-w-[90%] lg:max-w-none ${message.role === 'user' ? 'items-end' : ''}`}>
                  <div className={`p-4 lg:p-5 rounded-2xl text-[13px] lg:text-[14px] leading-relaxed relative ${
                    message.role === 'user' 
                      ? 'bg-[#111] border border-[#1F1F1F] text-[#D1D5DB]' 
                      : 'bg-[#0A0A0A] border-l-2 border-emerald-500/50 text-[#D1D5DB] rounded-tl-none shadow-lg shadow-black/20'
                  }`}>
                    {message.role === 'assistant' && (
                      <div className="flex items-center space-x-2 text-[8px] lg:text-[9px] text-emerald-500 font-mono mb-2 lg:mb-3 uppercase tracking-tighter opacity-80">
                        {message.content ? <span>&gt; generating context</span> : <span className="animate-pulse">_ processing</span>}
                      </div>
                    )}
                    <span className={message.role === 'user' ? 'italic font-serif text-white/90' : 'text-neutral-300'}>
                      {message.content}
                    </span>

                    {message.blocks?.map((block, i) => (
                      <div key={i} className="mt-4">
                        {block.type === 'diff' && (
                          <DiffViewer 
                            fileName={block.content.fileName}
                            oldCode={block.content.oldCode}
                            newCode={block.content.newCode}
                            onApprove={() => console.log("Approved diff")}
                          />
                        )}
                        {block.type === 'tool' && (
                          <div className="bg-[#050505] border border-[#1A1A1A] rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-[#0A0A0A] border-b border-[#1A1A1A] flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Terminal size={12} className="text-emerald-500" />
                                <span className="text-[10px] font-mono text-white">{block.content.name}</span>
                              </div>
                              <span className={`text-[8px] font-black uppercase tracking-widest ${block.content.status === 'done' ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`}>
                                {block.content.status}
                              </span>
                            </div>
                            <div className="p-3 font-mono text-[10px] text-[#555] space-y-1">
                              <div><span className="text-[#333]"># args:</span> {JSON.stringify(block.content.args)}</div>
                              {block.content.result && (
                                <div className="mt-2 text-[#777] max-h-32 overflow-y-auto custom-scrollbar">
                                  <span className="text-[#333]"># output:</span>
                                  <pre className="mt-1 whitespace-pre-wrap">{typeof block.content.result === 'string' ? block.content.result : JSON.stringify(block.content.result, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-[8px] lg:text-[9px] text-[#444] uppercase tracking-widest font-mono group-hover:text-[#555] transition-colors px-1">
                    {message.role === 'user' ? 'User' : 'MiMo'} • Now
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pending Approvals Section */}
        {pendingApprovals.length > 0 && (
          <div className="mx-auto max-w-3xl w-full px-4 md:px-8 lg:px-12 mb-4 z-10">
            <div className="bg-[#0B0B0B] border border-amber-500/30 rounded-2xl p-4 shadow-xl shadow-black/40 relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/50 to-emerald-500/50"></div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-500">Security Gate: Write Approval</h4>
                  </div>
                  <p className="text-[11px] text-[#888] leading-normal mt-1">
                    {pendingApprovals[0].reason}
                  </p>
                  <div className="mt-2 text-xs font-mono text-white bg-[#050505] px-2.5 py-1.5 rounded border border-[#1A1A1A] truncate">
                    {pendingApprovals[0].filePath}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                  <button 
                    onClick={() => handleApproveWrite(pendingApprovals[0].id, false)}
                    className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-950/20 transition-all border border-red-500/20"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => handleApproveWrite(pendingApprovals[0].id, true)}
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-950/20"
                  >
                    Approve Write
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Technical Context View */}
        <div className={`flex-1 overflow-y-auto p-4 lg:hidden ${activeMobileView === 'context' ? 'block' : 'hidden'}`}>
          <div className="space-y-6">
            <section className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-[10px] uppercase tracking-widest text-[#444] font-bold mb-4">Workspace Health</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-[#050505] p-3 rounded-lg border border-[#1A1A1A]">
                  <span className="text-xs text-[#777]">SQLite Runtime</span>
                  <span className="text-xs text-emerald-500 font-mono">0.4ms</span>
                </div>
                <div className="flex justify-between items-center bg-[#050505] p-3 rounded-lg border border-[#1A1A1A]">
                  <span className="text-xs text-[#777]">Context Depth</span>
                  <span className="text-xs text-white font-mono uppercase">Optimal</span>
                </div>
              </div>
            </section>

            <section className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-[10px] uppercase tracking-widest text-[#444] font-bold mb-4">Active Task Engine</h3>
              <div className="space-y-3">
                {[
                  { label: 'Impact Analysis', status: 'done' },
                  { label: 'WebSocket Link', status: 'done' },
                  { label: 'CCC Integration', status: 'active' },
                  { label: 'Running Tests', status: 'pending' }
                ].map((step, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-[#0A0A0A] transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${step.status === 'done' ? 'bg-emerald-500' : step.status === 'active' ? 'bg-amber-500 animate-pulse' : 'bg-[#222]'}`}></div>
                      <span className={`text-[11px] ${step.status === 'active' ? 'text-white' : 'text-[#555]'}`}>{step.label}</span>
                    </div>
                    <span className="text-[9px] font-mono text-[#333] group-hover:text-[#444] uppercase tracking-widest">{step.status}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Input Bar */}
        <footer className={`p-4 lg:p-6 border-t border-[#1F1F1F] bg-[#080808]/90 backdrop-blur-md z-10 shrink-0 ${activeMobileView !== 'chat' ? 'hidden lg:block' : 'block'}`}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center space-x-2 lg:space-x-3 bg-[#111] border border-[#222] p-1.5 pr-2 lg:pr-3 rounded-[20px] focus-within:border-[#333] transition-all">
              <button className="flex w-9 h-9 rounded-full bg-[#161616] hover:bg-[#1A1A1A] flex items-center justify-center border border-[#222] text-[#444] hover:text-white transition-all shrink-0">
                <Plus size={16} />
              </button>
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about context..." 
                className="bg-transparent flex-1 border-none focus:ring-0 text-sm text-white px-2 py-2 placeholder:text-[#333]"
              />
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim() || !isConnected}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  inputValue.trim() && isConnected ? 'bg-white text-black shadow-lg shadow-white/5' : 'bg-[#1A1A1A] text-[#333]'
                }`}
              >
                <Send size={16} className={inputValue.trim() && isConnected ? 'translate-x-[1px] -translate-y-[1px]' : ''} />
              </button>
            </div>
            <div className="hidden lg:flex items-center justify-between mt-3 px-2">
              <div className="flex gap-4">
                {['Plan Fix', 'Review Architecture'].map(action => (
                  <button key={action} className="text-[9px] text-[#444] uppercase tracking-widest font-bold hover:text-[#777] transition-colors">
                    {action}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-[#222] flex items-center gap-1">
                Context Engine <span className="text-[#444] font-mono uppercase tracking-tighter">Syncing</span>
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Right Sidebar (Context Engine) - Desktop slide-over or fixed side */}
      <AnimatePresence>
        {(isContextOpen || (!window.matchMedia("(max-width: 1024px)").matches && isContextOpen)) && (
          <motion.aside
            initial={{ x: 280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 280, opacity: 0 }}
            className={`fixed lg:relative inset-y-0 right-0 w-72 border-l border-[#1F1F1F] bg-[#0A0A0A] p-6 z-50 lg:z-20 shrink-0 overflow-y-auto shadow-2xl lg:shadow-none`}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[10px] uppercase tracking-widest text-[#444] font-bold">Context Engine</h2>
              <button 
                onClick={() => setIsContextOpen(false)}
                className="lg:hidden p-1 text-[#444] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-10">
              <div className="space-y-3">
                <p className="text-[11px] text-[#888] flex justify-between">
                  <span>Workspace Depth</span>
                  <span className="text-white font-mono">Level 4</span>
                </p>
                <div className="h-1 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#222]/50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "66%" }}
                    className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  />
                </div>
              </div>

            <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-widest text-[#444] font-bold">Active Task</p>
                {activeTask ? (
                  <TaskPanel 
                    title={activeTask.title} 
                    steps={activeTask.steps} 
                    onAction={(a) => console.log("Task action:", a)}
                  />
                ) : (
                  <div className="p-8 border border-dashed border-[#1A1A1A] rounded-xl flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full bg-[#080808] border border-[#1A1A1A] flex items-center justify-center text-[#222] mb-3">
                      <Layers size={20} />
                    </div>
                    <p className="text-[10px] text-[#222] uppercase font-black">No active task</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-[10px] uppercase tracking-widest text-[#444] font-bold">Recent Tools</p>
                <div className="font-mono text-[10px] space-y-2.5">
                  {[
                    { tool: 'cccQuery', res: 'SUCCESS' },
                    { tool: 'readFile', res: 'SUCCESS' },
                    { tool: 'gitDiff', res: 'SUCCESS' },
                    { tool: 'applyPatch', res: 'PENDING', color: 'text-amber-500' }
                  ].map((t, i) => (
                    <div key={i} className="flex justify-between items-center text-[#555] group cursor-default">
                      <span className="group-hover:text-[#888] transition-colors">{t.tool}</span>
                      <span className={t.color || 'text-[#444]'}>{t.res}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {(isSidebarOpen || isContextOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setIsSidebarOpen(false); setIsContextOpen(false); }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* User Guide Slide-over */}
      <AnimatePresence>
        {isGuideOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGuideOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-[#0A0A0A] z-[70] shadow-2xl overflow-hidden border-l border-[#1F1F1F]"
            >
              <UserGuide onClose={() => setIsGuideOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

