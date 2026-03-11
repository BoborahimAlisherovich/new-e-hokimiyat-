"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  Plus,
  Loader2,
  Mic,
  MicOff,
  Trash2,
  Users,
  FileText,
  Maximize2,
  Minimize2,
  History,
  Menu,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { API_BASE, getAccessToken } from "@/lib/api/client";
import { useAudioRecorder, formatTime } from "@/hooks/use-audio-recorder";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// ============================================================================
// Types
// ============================================================================

interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  detected_intent?: string;
  is_audio_message?: boolean;
}

interface AIConversation {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_message?: {
    role: string;
    content: string;
    created_at: string;
  };
}

const isEmptyConversation = (conv: AIConversation) =>
  (!conv.last_message?.content || !conv.last_message.content.trim()) &&
  (!conv.title || conv.title.trim() === "" || conv.title === "Yangi suhbat");

const buildConversationTitle = (text: string) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "Yangi suhbat";
  return normalized.length > 60 ? `${normalized.slice(0, 60)}...` : normalized;
};

const toListTitle = (text: string, max = 32) =>
  text.length > max ? `${text.slice(0, max)}...` : text;

const commandLabels: Record<string, string> = {
  GENERATE_REPORT: "hisobot yaratish",
  CREATE_TASK: "yangi topshiriq yaratish",
  CLOSE_TASK: "topshiriqni yopish",
  CREATE_RECURRING_TASK: "takrorlanuvchi topshiriq yaratish",
  EXPORT_ANALYTICS: "analitikani eksport qilish",
  CLOSE_APPEAL: "murojaatni yopish",
  STATUS_CHECK: "holatni tekshirish",
  ANALYTICS_QUERY: "analitika ma'lumotini olish",
  ANALITICS_QUERY: "analitika ma'lumotini olish",
};

const commandToLabel = (rawCommand: string) => {
  if (commandLabels[rawCommand]) return commandLabels[rawCommand];
  return rawCommand.toLowerCase().split("_").join(" ");
};

const humanizeAssistantCommands = (text: string) => {
  const withQuestionText = text.replace(
    /⚡\s*([A-Z_]{3,})\s+buyrug'?ini\s+bajarishni\s+xohlaysizmi\?/gi,
    (_full, rawCommand: string) => `⚡ ${commandToLabel(rawCommand)}ni amalga oshiraymi?`
  );

  return withQuestionText.replace(
    /\b([A-Z_]{3,})\b/g,
    (full, rawCommand: string) => {
      if (!rawCommand.includes("_")) return full;
      return commandToLabel(rawCommand);
    }
  );
};

// ============================================================================
// Constants
// ============================================================================

const messageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const }
  }
};

// ============================================================================
// Main Component
// ============================================================================

export default function AIAssistantPage() {
  // State
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Audio states
  const [speechText, setSpeechText] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef<boolean>(false);
  const speechRecognitionRef = useRef<any>(null);
  const speechFinalRef = useRef<string>("");
  const isRecordingRef = useRef<boolean>(false);

  const {
    isRecording,
    audioBlob,
    audioUrl,
    recordingTime,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  // ============================================================================
  // API Functions
  // ============================================================================

  const loadConversations = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get<AIConversation[] | { results: AIConversation[] }>(
        "/ai/conversations/"
      );
      const data = response.data;
      const items = Array.isArray(data) ? data : data?.results || [];
      setConversations(items.filter((conv) => !isEmptyConversation(conv)));
    } catch (err) {
      console.error("Error loading conversations:", err);
      setError("Suhbatlarni yuklashda xatolik");
      setConversations([]);
    }
  }, []);

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const response = await api.get<AIConversation & { messages: AIMessage[] }>(`/ai/conversations/${conversationId}/`);
      setCurrentConversation(response.data);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNewConversation = useCallback(() => {
    // Do not create server-side empty conversation.
    // Real conversation is created only when first message is sent.
    setCurrentConversation(null);
    setMessages([]);
    setInputMessage("");
    setIsMobileSidebarOpen(false);
  }, []);

  const selectConversation = useCallback((conv: AIConversation) => {
    setCurrentConversation(conv);
    loadConversationMessages(conv.id);
    setIsMobileSidebarOpen(false);
  }, [loadConversationMessages]);

  const deleteConversation = useCallback(async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Ushbu suhbatni o'chirmoqchimisiz?")) return;
    
    try {
      await api.delete(`/ai/conversations/${conversationId}/`);
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      loadConversations();
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  }, [currentConversation, loadConversations]);

  const sendMessage = async (overrideText?: string) => {
    const userMessage = (overrideText ?? inputMessage).trim();
    if (!userMessage) return;

    let convId = currentConversation?.id;
    if (!convId) {
      try {
        const title = buildConversationTitle(userMessage);
        const created = await api.post<AIConversation>("/ai/conversations/", {
          title,
        });
        convId = created.data.id;
        setCurrentConversation(created.data);
      } catch (err) {
        console.error("Error creating conversation:", err);
        return;
      }
    }

    setInputMessage("");
    setIsSending(true);

    const tempUserMessage: AIMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    shouldScrollRef.current = true;
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await api.post<{ user_message: AIMessage; ai_message: AIMessage }>(
        `/ai/conversations/${convId}/send_message/`,
        { message: userMessage }
      );

      loadConversations();
      const conv = conversations.find(c => c.id === convId);
      if (conv) setCurrentConversation(conv);

      shouldScrollRef.current = true;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        response.data.user_message,
        response.data.ai_message,
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      shouldScrollRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSpeechSupported(Boolean(SR));
    }
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    if (!isRecording && speechText.trim() && audioBlob) {
      setInputMessage(speechText.trim());
      resetRecording();
    }
  }, [isRecording, speechText, audioBlob, resetRecording]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleRecordToggle = async () => {
    if (isRecording) {
      stopRecording();
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
        speechRecognitionRef.current = null;
      }
      resetRecording();
    } else {
      setSpeechText("");
      await startRecording();
      
      if (speechSupported) {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SR) {
          const recognition = new SR();
          recognition.lang = "uz-UZ";
          recognition.continuous = true;
          recognition.interimResults = false;

          recognition.onresult = (event: any) => {
            const finalChunks: string[] = [];
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              const text = result[0]?.transcript || "";
              if (result.isFinal) finalChunks.push(text);
            }
            if (finalChunks.length) {
              const combined = `${speechFinalRef.current} ${finalChunks.join(" ")}`.trim();
              speechFinalRef.current = combined;
              setSpeechText(combined);
              if (isRecordingRef.current) setInputMessage(combined);
            }
          };

          recognition.onerror = () => {};
          recognition.onend = () => {
            if (speechFinalRef.current.trim()) {
              setInputMessage((prev) => (prev.trim() ? prev : speechFinalRef.current.trim()));
            }
          };

          speechFinalRef.current = "";
          recognition.start();
          speechRecognitionRef.current = recognition;
        }
      }
    }
  };

  const quickChat = useCallback(async (message: string) => {
    setInputMessage(message);
  }, []);

  const getIntentBadge = (intent?: string) => {
    if (!intent || intent === "UNKNOWN") return null;

    const intentLabels: Record<string, string> = {
      CREATE_RECURRING_TASK: "Takrorlanuvchi topshiriq",
      EXPORT_ANALYTICS: "Analitika eksport",
      ANALITICS_QUERY: "Analitika so'rov",
      CREATE_TASK: "Topshiriq yaratish",
      CLOSE_TASK: "Topshiriqni yopish",
      GENERATE_REPORT: "Hisobot yaratish",
      CLOSE_APPEAL: "Murojaatni yopish",
      STATUS_CHECK: "Holat tekshirish",
    };

    const label = intentLabels[intent] || intent;
    return (
      <Badge className="bg-blue-50 text-blue-600 text-xs border-blue-100 ml-2">
        {label}
      </Badge>
    );
  };

  const extractReportId = (content?: string) => {
    if (!content) return null;
    const match = content.match(/\[REPORT_ID:([0-9a-f-]+)\]/i);
    return match ? match[1] : null;
  };

  const sanitizeReportContent = (content?: string) => {
    if (!content) return "";
    return humanizeAssistantCommands(
      content
      .replace(/\[REPORT_ID:[0-9a-f-]+\]\s*/gi, "")
      .replace(/^.*PDF yuklab olish:.*$/gim, "")
      .replace(/^.*Hisobot ID:.*$/gim, "")
      .trim()
    );
  };

  const downloadReportPdfById = async (reportId: string) => {
    const url = `${API_BASE}/ai/reports/${reportId}/download/`;
    try {
      const token = getAccessToken();
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `hisobot-${reportId}.pdf`;
      link.click();
    } catch (err) {
      console.error("PDF download error:", err);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div 
      className={`
        flex flex-col h-dvh max-h-dvh min-h-0 overflow-hidden
        ${isMaximized ? 'fixed inset-0 z-50' : ''}
        bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_45%),linear-gradient(160deg,#f7fbff_0%,#eef4ff_55%,#f8fafc_100%)]
      `}
    >
      {/* Header */}
      <ChatHeader 
        key={currentConversation?.id ?? "no-conversation"}
        isMaximized={isMaximized}
        onToggleMaximize={() => setIsMaximized(!isMaximized)}
        onToggleDesktopSidebar={() => setIsChatSidebarOpen((prev) => !prev)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        isDesktopSidebarOpen={isChatSidebarOpen}
        currentConversation={currentConversation}
        onRenameConversation={async (title: string) => {
          if (!currentConversation) return;
          const trimmed = title.trim();
          if (!trimmed || trimmed === currentConversation.title) return;

          try {
            const response = await api.patch<AIConversation>(
              `/ai/conversations/${currentConversation.id}/`,
              { title: trimmed }
            );

            setCurrentConversation((prev) =>
              prev ? { ...prev, title: response.data.title } : prev
            );
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === currentConversation.id
                  ? { ...conv, title: response.data.title }
                  : conv
              )
            );
          } catch (err) {
            console.error("Error renaming conversation:", err);
          }
        }}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chat History Sidebar - Desktop */}
        <ChatSidebar
          isOpen={isChatSidebarOpen}
          conversations={conversations}
          currentConversation={currentConversation}
          onSelectConversation={selectConversation}
          onDeleteConversation={deleteConversation}
          onCreateConversation={createNewConversation}
        />

        {/* Chat History Sidebar - Mobile Overlay */}
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          conversations={conversations}
          currentConversation={currentConversation}
          onSelectConversation={selectConversation}
          onDeleteConversation={deleteConversation}
          onCreateConversation={createNewConversation}
        />

        {/* Chat Messages Area */}
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          isSending={isSending}
          messagesEndRef={messagesEndRef}
          inputMessage={inputMessage}
          isRecording={isRecording}
          recordingTime={recordingTime}
          audioBlob={audioBlob}
          audioUrl={audioUrl}
          speechText={speechText}
          onInputChange={setInputMessage}
          onSendMessage={() => sendMessage()}
          onRecordToggle={handleRecordToggle}
          onQuickChat={quickChat}
          onResetRecording={resetRecording}
          sendMessageWithAudio={() => sendMessage(speechText)}
          getIntentBadge={getIntentBadge}
          extractReportId={extractReportId}
          sanitizeReportContent={sanitizeReportContent}
          downloadReportPdfById={downloadReportPdfById}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function ChatHeader({ 
  isMaximized, 
  onToggleMaximize, 
  onToggleDesktopSidebar,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
  isDesktopSidebarOpen,
  currentConversation,
  onRenameConversation,
}: { 
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onToggleDesktopSidebar: () => void;
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
  isDesktopSidebarOpen: boolean;
  currentConversation: AIConversation | null;
  onRenameConversation: (title: string) => Promise<void>;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(currentConversation?.title || "");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const saveTitle = async () => {
    if (!currentConversation) return;
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(currentConversation.title || "");
      setIsEditingTitle(false);
      return;
    }
    if (trimmed === currentConversation.title) {
      setIsEditingTitle(false);
      return;
    }

    setIsSavingTitle(true);
    await onRenameConversation(trimmed);
    setIsSavingTitle(false);
    setIsEditingTitle(false);
  };

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shrink-0 z-20">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMobileSidebar}
          className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900"
        >
          {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Desktop Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDesktopSidebar}
          className="hidden lg:flex h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900"
        >
          <History className={`h-5 w-5 ${isDesktopSidebarOpen ? "text-blue-600" : ""}`} />
        </Button>

        {/* Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-xl bg-linear-to-br from-sky-600 to-blue-700 shadow-md">
            <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="hidden sm:block">
            {currentConversation ? (
              <div className="flex items-center gap-2 min-w-0 max-w-105">
                {isEditingTitle ? (
                  <>
                    <input
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveTitle();
                        }
                        if (e.key === "Escape") {
                          setTitleDraft(currentConversation.title || "");
                          setIsEditingTitle(false);
                        }
                      }}
                      className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      autoFocus
                      maxLength={120}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void saveTitle()}
                      disabled={isSavingTitle}
                      className="h-8 w-8 rounded-md hover:bg-slate-100"
                    >
                      <Check className="h-4 w-4 text-slate-700" />
                    </Button>
                  </>
                ) : (
                  <>
                    <h1
                      title={currentConversation.title}
                      className="text-lg font-semibold text-slate-900 wrap-break-word"
                    >
                      {currentConversation.title || "Yangi suhbat"}
                    </h1>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setTitleDraft(currentConversation.title || "");
                        setIsEditingTitle(true);
                      }}
                      className="h-8 w-8 rounded-md hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4 text-slate-600" />
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <h1 className="text-lg font-semibold text-slate-900">AI Yordamchi</h1>
            )}
            <p className="text-xs text-slate-500">
              {currentConversation ? "Suhbat nomini tahrirlash mumkin" : "Sun'iy intellekt yordamchisi"}
            </p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-base font-semibold text-slate-900">AI Yordamchi</h1>
          </div>
        </div>
      </div>

      {/* Maximize Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleMaximize}
        className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900"
      >
        {isMaximized ? <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />}
      </Button>
    </header>
  );
}

function ChatSidebar({
  isOpen,
  conversations,
  currentConversation,
  onSelectConversation,
  onDeleteConversation,
  onCreateConversation,
}: {
  isOpen: boolean;
  conversations: AIConversation[];
  currentConversation: AIConversation | null;
  onSelectConversation: (conv: AIConversation) => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onCreateConversation: () => void;
}) {
  if (!isOpen) return null;

  return (
    <aside className="hidden lg:flex flex-col w-72 h-full min-h-0 bg-white/80 backdrop-blur-xl border-r border-slate-200/80 shrink-0 overflow-hidden">
      {/* New Chat Button */}
      <div className="p-3 border-b border-slate-200/80 shrink-0">
        <Button
          onClick={onCreateConversation}
          className="w-full justify-start gap-2 bg-slate-900 hover:bg-slate-800 text-white border-0 shadow-sm text-sm"
        >
          <Plus className="h-4 w-4" />
          Yangi suhbat
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="px-2 py-2">
            <div className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wider">
              Suhbatlar
            </div>
            <div className="space-y-1">
              {conversations.map((conv) => {
                const displayTitle = conv.title && conv.title !== "Yangi suhbat"
                  ? toListTitle(conv.title)
                  : conv.last_message?.role === "user" && conv.last_message?.content
                    ? toListTitle(conv.last_message.content)
                    : "Yangi suhbat";
                
                return (
                  <div key={conv.id} className="flex w-full items-center gap-1">
                    <div
                      onClick={() => onSelectConversation(conv)}
                      className={`group flex flex-1 min-w-0 items-center gap-2 px-3 py-2 rounded-xl cursor-pointer border transition-all duration-200 ${
                        currentConversation?.id === conv.id
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <button
                        onClick={(e) => onDeleteConversation(conv.id, e)}
                        className={`shrink-0 inline-flex h-6 w-6 min-w-6 items-center justify-center rounded-md border transition-colors ${
                          currentConversation?.id === conv.id
                            ? "border-white/40 bg-white/15 text-white hover:bg-white/25"
                            : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                        aria-label="Suhbatni o'chirish"
                        title="Suhbatni o'chirish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <span className="block flex-1 min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium">
                        {displayTitle}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Desktop input zone balance: keeps sidebar from visually running into chat input */}
      <div className="h-24 shrink-0 border-t border-slate-200/80 bg-white/70" />
    </aside>
  );
}

function MobileSidebar({
  isOpen,
  onClose,
  conversations,
  currentConversation,
  onSelectConversation,
  onDeleteConversation,
  onCreateConversation,
}: {
  isOpen: boolean;
  onClose: () => void;
  conversations: AIConversation[];
  currentConversation: AIConversation | null;
  onSelectConversation: (conv: AIConversation) => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onCreateConversation: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-72 min-h-0 bg-white/95 backdrop-blur-xl border-r border-slate-200/80 z-40 lg:hidden flex flex-col pt-16"
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 h-8 w-8 rounded-lg"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* New Chat Button */}
            <div className="p-3 border-b border-slate-200/80 shrink-0">
              <Button
                onClick={onCreateConversation}
                className="w-full justify-start gap-2 bg-slate-900 hover:bg-slate-800 text-white border-0 shadow-sm text-sm"
              >
                <Plus className="h-4 w-4" />
                Yangi suhbat
              </Button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="px-2 py-2">
                  <div className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wider">
                    Suhbatlar
                  </div>
                  <div className="space-y-1">
                    {conversations.map((conv) => {
                      const displayTitle = conv.title && conv.title !== "Yangi suhbat"
                        ? toListTitle(conv.title)
                        : conv.last_message?.role === "user" && conv.last_message?.content
                          ? toListTitle(conv.last_message.content)
                          : "Yangi suhbat";
                      
                      return (
                        <div key={conv.id} className="flex w-full items-center gap-1">
                          <div
                            onClick={() => onSelectConversation(conv)}
                            className={`group flex flex-1 min-w-0 items-center gap-2 px-3 py-2 rounded-xl cursor-pointer border transition-all duration-200 ${
                              currentConversation?.id === conv.id
                                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                : "bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <button
                              onClick={(e) => onDeleteConversation(conv.id, e)}
                              className={`shrink-0 inline-flex h-6 w-6 min-w-6 items-center justify-center rounded-md border transition-colors ${
                                currentConversation?.id === conv.id
                                  ? "border-white/40 bg-white/15 text-white hover:bg-white/25"
                                  : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              }`}
                              aria-label="Suhbatni o'chirish"
                              title="Suhbatni o'chirish"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <span className="block flex-1 min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium">
                              {displayTitle}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function ChatArea({
  messages,
  isLoading,
  isSending,
  messagesEndRef,
  inputMessage,
  isRecording,
  recordingTime,
  audioBlob,
  audioUrl,
  speechText,
  onInputChange,
  onSendMessage,
  onRecordToggle,
  onQuickChat,
  onResetRecording,
  sendMessageWithAudio,
  getIntentBadge,
  extractReportId,
  sanitizeReportContent,
  downloadReportPdfById,
}: {
  messages: AIMessage[];
  isLoading: boolean;
  isSending: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputMessage: string;
  isRecording: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  speechText: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onRecordToggle: () => void;
  onQuickChat: (message: string) => void;
  onResetRecording: () => void;
  sendMessageWithAudio: () => void;
  getIntentBadge: (intent?: string) => React.ReactNode;
  extractReportId: (content?: string) => string | null;
  sanitizeReportContent: (content?: string) => string;
  downloadReportPdfById: (reportId: string) => void;
}) {
  return (
    <main className="flex-1 flex flex-col min-w-0 h-full min-h-0 overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
            {/* Welcome Screen */}
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-8 sm:py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-br from-sky-600 to-blue-700 mb-4 sm:mb-6 shadow-[0_16px_30px_-18px_rgba(3,105,161,0.75)]">
                  <Bot className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">AI Yordamchi</h2>
                <p className="text-slate-600 mb-6 sm:mb-8 max-w-md mx-auto px-4">
                  Topshiriqlar, murojaatlar va hisobotlar haqida so'rang.
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center px-4">
                  {[
                    { text: "Bugungi holat", query: "Bugungi holat qanday?" },
                    { text: "Muddati o'tgan topshiriqlar", query: "Muddati o'tgan topshiriqlar nechta?" },
                    { text: "Haftalik hisobot", query: "Haftalik hisobot yarat" }
                  ].map((item, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      onClick={() => onQuickChat(item.query)}
                      className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm text-xs sm:text-sm"
                    >
                      {item.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages List */}
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  className={`flex gap-2 sm:gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-sky-600 to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[75%] sm:max-w-[80%] ${message.role === "user" ? "order-1" : ""}`}>
                    <div className={`rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2.5 sm:py-4 shadow-sm ${
                      message.role === "user"
                        ? "bg-slate-900 text-white"
                        : "bg-white/90 backdrop-blur-xl border border-slate-200/80 text-slate-800"
                    }`}>
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-1.5 sm:mb-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-blue-600">AI Yordamchi</span>
                          {getIntentBadge(message.detected_intent)}
                        </div>
                      )}
                      <div className={`prose prose-xs sm:prose-sm max-w-none ${
                        message.role === "user" ? "text-white prose-invert" : "text-slate-700"
                      }`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {sanitizeReportContent(message.content)}
                        </ReactMarkdown>
                      </div>
                      {message.role === "assistant" && extractReportId(message.content) && (
                        <div className="mt-2 sm:mt-3">
                          <button
                            onClick={() => downloadReportPdfById(extractReportId(message.content)!)}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            PDF
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 px-1">
                      {new Date(message.created_at).toLocaleTimeString("uz-UZ", { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-emerald-600 to-teal-700 flex items-center justify-center shrink-0 shadow-sm">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading Indicator */}
            {isSending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 sm:gap-4"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-sky-600 to-blue-700 flex items-center justify-center shadow-sm">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2.5 sm:py-4 border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3 text-slate-600">
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium">AI javob yozmoqda...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area - Fixed at Bottom */}
      <ChatInput
        inputMessage={inputMessage}
        isRecording={isRecording}
        recordingTime={recordingTime}
        audioBlob={audioBlob}
        audioUrl={audioUrl}
        speechText={speechText}
        isSending={isSending}
        onInputChange={onInputChange}
        onSendMessage={onSendMessage}
        onRecordToggle={onRecordToggle}
        onResetRecording={onResetRecording}
        sendMessageWithAudio={sendMessageWithAudio}
      />
    </main>
  );
}

function ChatInput({
  inputMessage,
  isRecording,
  recordingTime,
  audioBlob,
  audioUrl,
  speechText,
  isSending,
  onInputChange,
  onSendMessage,
  onRecordToggle,
  onResetRecording,
  sendMessageWithAudio,
}: {
  inputMessage: string;
  isRecording: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  speechText: string;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onRecordToggle: () => void;
  onResetRecording: () => void;
  sendMessageWithAudio: () => void;
}) {
  return (
    <div className="p-3 sm:p-4 bg-white/70 backdrop-blur-xl border-t border-slate-200/80 shrink-0">
      <div className="max-w-3xl mx-auto">
        {/* Recording Indicator */}
        {isRecording && (
          <div className="mb-2 sm:mb-3 flex items-center gap-3 p-2 sm:p-3 rounded-xl bg-red-50 border border-red-200">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs sm:text-sm text-red-600 font-medium">
              Yozib olinmoqda: {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {/* Audio Preview */}
        {audioBlob && !isRecording && (
          <div className="mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-blue-50 border border-blue-200">
            <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
            <audio src={audioUrl || undefined} controls className="flex-1 h-7 sm:h-8" />
            <Button 
              size="sm" 
              onClick={sendMessageWithAudio} 
              disabled={isSending} 
              className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
            >
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Yuborish</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onResetRecording} className="h-8 w-8">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Input Field */}
        <div className="flex gap-2 items-end">
          <Button
            variant="outline"
            size="icon"
            onClick={onRecordToggle}
            disabled={isSending}
            className={`shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${
              isRecording 
                ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" 
                : "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          
          <div className="flex-1 relative">
            <Textarea
              placeholder="Xabar yozing..."
              value={inputMessage}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              disabled={isSending || isRecording}
              rows={1}
              className="w-full bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 resize-none min-h-10 sm:min-h-12 max-h-32 sm:max-h-50 pr-10 sm:pr-12 rounded-xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-sm text-sm"
            />
          </div>
          
          <Button
            onClick={onSendMessage}
            disabled={!inputMessage.trim() || isSending || isRecording}
            className="shrink-0 h-10 w-10 sm:h-11 sm:px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <p className="text-xs text-slate-400 text-center mt-1.5 sm:mt-2 hidden sm:block">
          Enter bilan yuborish, Shift+Enter yangi qator
        </p>
      </div>
    </div>
  );
}
