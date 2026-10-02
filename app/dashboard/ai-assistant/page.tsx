"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { VoiceRecordingBar } from "@/components/chat/voice-recorder";
import { usePushToTalk } from "@/hooks/use-push-to-talk";
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
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { API_BASE, getAccessToken } from "@/lib/api/client";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
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

/** Mikrofon jestiga uzatiladigan uchta amal */
type RecordControls = {
  start: () => void | Promise<void>;
  stop: () => void;
  cancel: () => void;
};

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
  /** Yozuvdan OLDINGI matn — bekor qilinganda shu qaytariladi */
  const inputBeforeRecordRef = useRef<string>("");

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

    // Optimistically remove the conversation from UI immediately
    setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));

    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
      setMessages([]);
    }

    try {
      await api.delete(`/ai/conversations/${conversationId}/`);

      // Refresh list from server to ensure we stay in sync.
      // (In case the server returns a different ordering or new items.)
      void loadConversations();
    } catch (err) {
      console.error("Error deleting conversation:", err);
      // If delete failed, reload the conversations to restore UI state.
      void loadConversations();
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

      // Optimistic sidebar update (avoid refetch on every message for performance)
      setConversations((prev) => {
        const now = new Date().toISOString();
        const existing = prev.find((c) => c.id === convId);
        const updated = existing
          ? { ...existing, updated_at: now }
          : ({ id: convId, title: buildConversationTitle(userMessage), updated_at: now } as any);
        return [updated, ...prev.filter((c) => c.id !== convId)];
      });

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
    // Yozuv tugagach aytilgan matn maydonga tushadi.
    //
    // ILGARI shu yerda `resetRecording()` ham chaqirilardi — ya'ni audio
    // darhol o'chib ketardi va pastdagi «ovozni AI ga yuborish» paneli
    // amalda HECH QACHON ko'rinmasdi. Endi audio saqlanadi: foydalanuvchi
    // matnni ham, ovozni ham yuborishi mumkin.
    if (!isRecording && speechText.trim()) {
      setInputMessage((prev) => (prev.trim() ? prev : speechText.trim()));
    }
  }, [isRecording, speechText]);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * OVOZ YOZISH — chatdagi bilan BIR XIL jest
   * =========================================
   * Ilgari bu tugma «bosildi — boshlandi, yana bosildi — to'xtadi»
   * tarzida ishlardi, chatdagi mikrofon esa bosib turishni talab qilardi.
   * Bitta tizimda ovoz yozishning ikki xil usuli bo'lishi foydalanuvchini
   * chalkashtiradi, shuning uchun ikkalasi ham `usePushToTalk` ga o'tdi.
   *
   * Bu yerdagi farq: yozuv bilan bir vaqtda NUTQ MATNGA aylantiriladi
   * (Web Speech API), shuning uchun `useVoiceRecorder` emas, mavjud
   * `useAudioRecorder` qoldirildi — faqat jest almashtirildi.
   */
  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      speechRecognitionRef.current = null;
    }
  }, []);

  /** Qo'yib yuborildi — yozuv tugadi, matn va audio saqlanadi */
  const handleRecordStop = useCallback(() => {
    stopRecording();
    stopSpeechRecognition();
  }, [stopRecording, stopSpeechRecognition]);

  /** Chapga surildi — yozuv ham, aytilgan matn ham bekor qilinadi */
  const handleRecordCancel = useCallback(() => {
    stopRecording();
    stopSpeechRecognition();
    resetRecording();
    speechFinalRef.current = "";
    setSpeechText("");
    setInputMessage(inputBeforeRecordRef.current);
  }, [resetRecording, stopRecording, stopSpeechRecognition]);

  const handleRecordStart = async () => {
    {
      inputBeforeRecordRef.current = inputMessage;
      setSpeechText("");
      resetRecording();
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
      <Badge className="bg-primary-soft text-primary-soft-foreground text-xs border-border ml-2">
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
          error={error}
          messagesEndRef={messagesEndRef}
          inputMessage={inputMessage}
          isRecording={isRecording}
          recordingTime={recordingTime}
          audioBlob={audioBlob}
          audioUrl={audioUrl}
          speechText={speechText}
          currentConversation={currentConversation}
          onInputChange={setInputMessage}
          onSendMessage={() => sendMessage()}
          recordControls={{
            start: handleRecordStart,
            stop: handleRecordStop,
            cancel: handleRecordCancel,
          }}
          onQuickChat={quickChat}
          onQuickAction={sendMessage}
          onResetRecording={resetRecording}
          sendMessageWithAudio={() => sendMessage(speechText)}
          onRetry={loadConversations}
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
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-card shrink-0 z-20">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMobileSidebar}
          className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Desktop Sidebar Toggle */}
        <Button
          variant="ghost"
          onClick={onToggleDesktopSidebar}
          aria-label={isDesktopSidebarOpen ? "Suhbatlar tarixini yashirish" : "Suhbatlar tarixini ko'rsatish"}
          title={isDesktopSidebarOpen ? "Suhbatlar tarixini yashirish" : "Suhbatlar tarixini ko'rsatish"}
          className={`hidden lg:inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold shadow-sm transition-all ${
            isDesktopSidebarOpen
              ? "border-border bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft"
              : "border-border-strong bg-white text-secondary-foreground hover:border-border hover:bg-background hover:text-primary"
          }`}
        >
          <History className={`h-4 w-4 ${isDesktopSidebarOpen ? "text-primary" : "text-muted-foreground"}`} />
          <span>{isDesktopSidebarOpen ? "Tarixni yashirish" : "Tarix"}</span>
        </Button>

        {/* Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-xl shadow-md bg-info">
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
                      className="h-8 w-full rounded-md border border-border-strong bg-white px-2 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/25"
                      autoFocus
                      maxLength={120}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void saveTitle()}
                      disabled={isSavingTitle}
                      className="h-8 w-8 rounded-md hover:bg-muted"
                    >
                      <Check className="h-4 w-4 text-secondary-foreground" />
                    </Button>
                  </>
                ) : (
                  <>
                    <h1
                      title={currentConversation.title}
                      className="text-lg font-semibold text-foreground wrap-break-word"
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
                      className="h-8 w-8 rounded-md hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <h1 className="text-lg font-semibold text-foreground">AI Yordamchi</h1>
            )}
            <p className="text-xs text-muted-foreground">
              {currentConversation ? "Suhbat nomini tahrirlash mumkin" : "Sun'iy intellekt yordamchisi"}
            </p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-base font-semibold text-foreground">AI Yordamchi</h1>
          </div>
        </div>
      </div>

      {/* Maximize Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleMaximize}
        className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
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
  const [isListVisible, setIsListVisible] = useState(true);

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isOpen ? 336 : 0,
        x: isOpen ? 0 : -24,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="hidden lg:flex flex-col h-full min-h-0 bg-card border-r border-border shrink-0 overflow-hidden"
      style={{ borderRightWidth: isOpen ? 1 : 0 }}
      aria-hidden={!isOpen}
    >
      {/* New Chat Button */}
      <div className="p-3 border-b border-border shrink-0">
        <Button
          onClick={onCreateConversation}
          disabled={!isOpen}
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
            <button
              type="button"
              onClick={() => setIsListVisible((prev) => !prev)}
              disabled={!isOpen}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
            >
              <span>Suhbatlar</span>
              {isListVisible ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {isListVisible && (
              <div className="mt-1 space-y-1">
                {conversations.map((conv) => {
                  return (
                    <ConversationListItem
                      key={conv.id}
                      conv={conv}
                      isActive={currentConversation?.id === conv.id}
                      onSelect={() => onSelectConversation(conv)}
                      onDelete={(e) => onDeleteConversation(conv.id, e)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Desktop input zone balance: keeps sidebar from visually running into chat input */}
      <div className="h-24 shrink-0 border-t border-border bg-card" />
    </motion.aside>
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
  const [isListVisible, setIsListVisible] = useState(true);

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
            className="fixed left-0 top-0 bottom-0 w-80 max-w-[86vw] min-h-0 bg-card border-r border-border z-40 lg:hidden flex flex-col pt-16"
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
            <div className="p-3 border-b border-border shrink-0">
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
                  <button
                    type="button"
                    onClick={() => setIsListVisible((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
                  >
                    <span>Suhbatlar</span>
                    {isListVisible ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {isListVisible && (
                    <div className="mt-1 space-y-1">
                      {conversations.map((conv) => {
                        return (
                          <ConversationListItem
                            key={conv.id}
                            conv={conv}
                            isActive={currentConversation?.id === conv.id}
                            onSelect={() => onSelectConversation(conv)}
                            onDelete={(e) => onDeleteConversation(conv.id, e)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function getConversationDisplayTitle(conv: AIConversation) {
  return conv.title && conv.title !== "Yangi suhbat"
    ? conv.title
    : conv.last_message?.role === "user" && conv.last_message?.content
      ? conv.last_message.content
      : "Yangi suhbat";
}

function getConversationSecondaryText(conv: AIConversation) {
  if (conv.last_message?.created_at) {
    return new Date(conv.last_message.created_at).toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return "Yangi suhbat";
}

function ConversationListItem({
  conv,
  isActive,
  onSelect,
  onDelete,
}: {
  conv: AIConversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const displayTitle = getConversationDisplayTitle(conv);
  const secondaryText = getConversationSecondaryText(conv);

  return (
    <div
      className={`group rounded-lg px-2 py-1 ${
        isActive ? "bg-primary-soft" : "hover:bg-muted"
      }`}
    >
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
          isActive ? "bg-primary-soft text-primary-soft-foreground" : "bg-transparent text-secondary-foreground"
        }`}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 items-center gap-3 text-left"
          title={displayTitle}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
              isActive
                ? "bg-primary-soft text-primary-soft-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <History className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-sm ${
                isActive ? "font-medium text-primary" : "font-medium text-foreground"
              }`}
              title={displayTitle}
            >
              {displayTitle}
            </p>
            <p
              className={`truncate text-xs ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              title={secondaryText}
            >
              {secondaryText}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onDelete}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
            isActive
              ? "border-border bg-white text-primary-soft-foreground hover:bg-primary-soft"
              : "border-border bg-white text-muted-foreground hover:border-border hover:bg-destructive-soft hover:text-destructive-soft-foreground"
          }`}
          aria-label="Suhbatni o'chirish"
          title="Suhbatni o'chirish"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ChatArea({
  messages,
  isLoading,
  isSending,
  error,
  messagesEndRef,
  inputMessage,
  isRecording,
  recordingTime,
  audioBlob,
  audioUrl,
  speechText,
  currentConversation,
  onInputChange,
  onSendMessage,
  recordControls,
  onQuickChat,
  onQuickAction,
  onResetRecording,
  sendMessageWithAudio,
  onRetry,
  getIntentBadge,
  extractReportId,
  sanitizeReportContent,
  downloadReportPdfById,
}: {
  messages: AIMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputMessage: string;
  isRecording: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  speechText: string;
  currentConversation: AIConversation | null;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  recordControls: RecordControls;
  onQuickChat: (message: string) => void;
  onQuickAction: (message: string) => void;
  onResetRecording: () => void;
  sendMessageWithAudio: () => void;
  onRetry: () => void;
  getIntentBadge: (intent?: string) => React.ReactNode;
  extractReportId: (content?: string) => string | null;
  sanitizeReportContent: (content?: string) => string;
  downloadReportPdfById: (reportId: string) => void;
}) {
  const quickActions = [
    { label: "Bugungi holat", query: "Bugungi holat qanday?" },
    { label: "Muddati o'tgan topshiriqlar", query: "Muddati o'tgan topshiriqlar nechta?" },
    { label: "Haftalik hisobot", query: "Haftalik hisobot yarat" },
    { label: "Murojaat holati", query: "Yangi murojaatlar holatini ko'rsat" },
  ];

  return (
    <main className="flex-1 flex flex-col min-w-0 h-full min-h-0 overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
            {error && (
              <div className="rounded-2xl bg-warning-soft px-4 py-3 text-left shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-warning">AI yordamchi bilan ulanishda uzilish bor</p>
                    <p className="text-xs text-warning">{error}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onRetry}
                    className="border-border bg-white text-warning-soft-foreground hover:bg-warning-soft"
                  >
                    Qayta yuklash
                  </Button>
                </div>
              </div>
            )}

            {/* Welcome Screen */}
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-8 sm:py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mb-4 sm:mb-6 shadow-[0_16px_30px_-18px_rgba(3,105,161,0.75)] bg-info">
                  <Bot className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3">AI Yordamchi</h2>
                <p className="text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto px-4">
                  Topshiriqlar, murojaatlar va hisobotlar haqida so'rang.
                </p>
                <div className="mb-4 rounded-2xl border border-border bg-card p-3 text-left shadow-sm sm:mx-auto sm:max-w-xl">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                    <Zap className="h-4 w-4" />
                    Tezkor foydalanish
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Mikrofon orqali savol berishingiz yoki tayyor tugmalarni bosib
                    kerakli ma'lumotni tez ochishingiz mumkin. Topshiriq, murojaat va
                    hisobotlar bo'yicha asosiy holat bir necha bosishda olinadi.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center px-4">
                  {quickActions.map((item, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      onClick={() => onQuickChat(item.query)}
                      className="bg-white border-border text-secondary-foreground hover:bg-muted hover:text-foreground shadow-sm text-xs sm:text-sm"
                    >
                      {item.label}
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
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-info">
                      <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[75%] sm:max-w-[80%] ${message.role === "user" ? "order-1" : ""}`}>
                    <div className={`rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2.5 sm:py-4 shadow-sm ${
                      message.role === "user"
                        ? "bg-slate-900 text-white"
                        : "bg-card border border-border text-foreground"
                    }`}>
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-1.5 sm:mb-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-primary">AI Yordamchi</span>
                          {getIntentBadge(message.detected_intent)}
                        </div>
                      )}
                      <div className={`prose prose-xs sm:prose-sm max-w-none ${
                        message.role === "user" ? "text-white prose-invert" : "text-secondary-foreground"
                      }`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {sanitizeReportContent(message.content)}
                        </ReactMarkdown>
                      </div>
                      {message.role === "assistant" && extractReportId(message.content) && (
                        <div className="mt-2 sm:mt-3">
                          <button
                            onClick={() => downloadReportPdfById(extractReportId(message.content)!)}
                            className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs sm:text-sm font-medium text-secondary-foreground border border-border hover:bg-secondary transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            PDF
                          </button>
                        </div>
                      )}
                      {message.role === "assistant" &&
                        /Tasdiqlash uchun 'ha'|xohlaysizmi\?/i.test(message.content) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => onQuickAction("ha")}
                              className="inline-flex items-center gap-2 rounded-lg bg-success px-3 py-2 text-xs sm:text-sm font-medium text-success-foreground transition-colors hover:bg-success/90"
                            >
                              <Check className="h-4 w-4" />
                              Tasdiqlash
                            </button>
                            <button
                              type="button"
                              onClick={() => onQuickAction("yo'q")}
                              className="inline-flex items-center gap-2 rounded-lg bg-destructive-soft px-3 py-2 text-xs sm:text-sm font-medium text-destructive-soft-foreground transition-colors hover:bg-destructive-soft"
                            >
                              <X className="h-4 w-4" />
                              Bekor qilish
                            </button>
                          </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 px-1">
                      {new Date(message.created_at).toLocaleTimeString("uz-UZ", { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-success">
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
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-sm bg-info">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="bg-card rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2.5 sm:py-4 border border-border shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-primary" />
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
        currentConversation={currentConversation}
        onQuickChat={onQuickChat}
        onInputChange={onInputChange}
        onSendMessage={onSendMessage}
        recordControls={recordControls}
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
  currentConversation,
  onQuickChat,
  onInputChange,
  onSendMessage,
  recordControls,
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
  currentConversation: AIConversation | null;
  onQuickChat: (message: string) => void;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  recordControls: RecordControls;
  onResetRecording: () => void;
  sendMessageWithAudio: () => void;
}) {
  const inlinePrompts = [
    "Bugungi topshiriqlar",
    "Murojaatlar statistikasi",
    "Hisobot yarat",
    "Muddati o'tgan vazifalar",
  ];

  /**
   * Chatdagi mikrofon bilan BIR XIL jest: bosib turing, qo'yib
   * yuborsangiz to'xtaydi, chapga sursangiz bekor bo'ladi, yuqoriga
   * sursangiz qulflanadi (sichqonchada bir marta bosish ham qulflaydi).
   */
  const gesture = usePushToTalk({
    onStart: recordControls.start,
    onStop: recordControls.stop,
    onCancel: recordControls.cancel,
    disabled: isSending,
    isRecording,
  });

  return (
    <div className="shrink-0 border-t border-border bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {inlinePrompts.map((shortcut) => (
            <button
              key={shortcut}
              type="button"
              onClick={() => onQuickChat(shortcut)}
              className="shrink-0 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {shortcut}
            </button>
          ))}
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:mb-3">
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
            {currentConversation ? "Suhbat faol" : "Yangi suhbat"}
          </span>
          <span>
            {isRecording
              ? "Qo'yib yuboring — to'xtaydi. Chapga suring — bekor bo'ladi."
              : "Enter yuboradi, Shift+Enter yangi qator ochadi."}
          </span>
        </div>

        {/*
          «Yozib olinmoqda» tasmasi ataylab OLIB TASHLANDI: u yozuv
          boshlanganda paydo bo'lib, pastdagi butun qatorni surib
          yuborardi — barmoq mikrofon ustida turgan payt tugma joyidan
          siljib ketardi. Endi vaqt ham, to'lqin ham qatorning O'ZIDA,
          mutlaq joylashgan panelda ko'rsatiladi.
        */}

        {/* Audio Preview */}
        {audioBlob && !isRecording && (
          <div className="mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-primary-soft">
            <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <audio src={audioUrl || undefined} controls className="flex-1 h-7 sm:h-8" />
            <Button 
              size="sm" 
              onClick={sendMessageWithAudio} 
              disabled={isSending} 
              className="h-10 bg-primary text-xs hover:bg-primary-hover sm:text-sm"
            >
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Yuborish</span>
              <span className="sm:hidden">AIga</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onResetRecording} className="h-10 w-10">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/*
          Input Field — `relative`: yozuv paneli shu qatorni USTIDAN
          yopadi, hech narsani surmaydi.
        */}
        <div className="relative flex gap-2 items-end">
          {/* Yozuv paneli */}
          {isRecording && (
            <div className="absolute inset-0 z-20 flex items-center rounded-xl bg-card">
              <VoiceRecordingBar
                seconds={recordingTime}
                locked={gesture.locked}
                willCancel={gesture.willCancel}
                dx={gesture.dx}
                onCancel={gesture.cancel}
                onStop={() => void gesture.stop()}
              />
            </div>
          )}

          <button
            type="button"
            {...gesture.handlers}
            disabled={isSending}
            aria-pressed={isRecording}
            aria-label={
              isRecording
                ? "Yozuvni tugatish"
                : "Ovoz bilan aytish — bosib turing yoki bir marta bosing"
            }
            className={`relative z-30 flex shrink-0 h-11 w-11 items-center justify-center rounded-xl border transition-colors disabled:opacity-50 ${gesture.surfaceClass} ${
              isRecording
                ? "border-destructive bg-destructive text-white"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          
          <div className="flex-1 relative">
            <Textarea
              placeholder="Masalan: bugungi topshiriqlar holatini qisqacha yozib bering"
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
              className="w-full bg-white border-border text-foreground placeholder:text-muted-foreground resize-none min-h-11 sm:min-h-12 max-h-32 sm:max-h-50 pr-10 sm:pr-12 rounded-xl focus:ring-2 focus:ring-border focus:border-border-strong shadow-sm text-sm"
            />
          </div>
          
          <Button
            onClick={onSendMessage}
            disabled={!inputMessage.trim() || isSending || isRecording}
            className="shrink-0 h-11 w-11 sm:h-11 sm:px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-xl shadow-sm"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
