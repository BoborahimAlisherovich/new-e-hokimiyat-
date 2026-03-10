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
  MessageSquare,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  Trash2,
  Users,
  FileText,
  Maximize2,
  Minimize2,
  History,
} from "lucide-react";
import { api } from "@/lib/api";
import { API_BASE, getAccessToken } from "@/lib/api/client";
import { useAudioRecorder, formatTime } from "@/hooks/use-audio-recorder";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

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

const messageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const }
  }
};

export default function AIAssistantPage() {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Audio states
  const [speechText, setSpeechText] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  
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

  const loadConversations = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get<AIConversation[] | { results: AIConversation[] }>(
        "/ai/conversations/"
      );
      const data = response.data;
      const items = Array.isArray(data) ? data : data?.results || [];
      setConversations(items);
    } catch (err) {
      console.error("Error loading conversations:", err);
      setError("Suhbatlarni yuklashda xatolik");
      setConversations([]);
    }
  }, []);

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

  const createNewConversation = useCallback(async () => {
    try {
      const response = await api.post<AIConversation>("/ai/conversations/", {
        title: "Yangi suhbat",
      });
      setCurrentConversation(response.data);
      setMessages([]);
      loadConversations();
    } catch (err) {
      console.error("Error creating conversation:", err);
    }
  }, [loadConversations]);

  const selectConversation = useCallback((conv: AIConversation) => {
    setCurrentConversation(conv);
    loadConversationMessages(conv.id);
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

    // Create new conversation if none exists
    if (!currentConversation) {
      await createNewConversation();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get conversation ID - from current or first available
    const convId = currentConversation?.id || conversations[0]?.id;
    if (!convId) {
      // Try to get newly created conversation
      const response = await api.get<AIConversation[] | { results: AIConversation[] }>("/ai/conversations/");
      const data = response.data;
      const items = Array.isArray(data) ? data : data?.results || [];
      if (items.length > 0) {
        setCurrentConversation(items[0]);
        loadConversationMessages(items[0].id);
        return sendMessage(overrideText);
      }
      return;
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
      ANALYTICS_QUERY: "Analitika so'rov",
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
    return content
      .replace(/\[REPORT_ID:[0-9a-f-]+\]\s*/gi, "")
      .replace(/^.*PDF yuklab olish:.*$/gim, "")
      .replace(/^.*Hisobot ID:.*$/gim, "")
      .trim();
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

  return (
    <div className={`flex flex-col ${isMaximized ? 'fixed inset-0 z-50' : ''} bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_45%),linear-gradient(160deg,#f7fbff_0%,#eef4ff_55%,#f8fafc_100%)] h-full`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-indigo-100/40 bg-white/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-indigo-50 text-slate-600 hover:text-indigo-600"
          >
            <History className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 shadow-md">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-slate-900">AI Yordamchi</h1>
              <p className="text-xs text-slate-500">Sun'iy intellekt yordamchisi</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-base font-semibold text-slate-900">AI Yordamchi</h1>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMaximized(!isMaximized)}
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-indigo-50 text-slate-600 hover:text-indigo-600"
        >
          {isMaximized ? <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />}
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Conversations */}
        <motion.aside
          initial={false}
          animate={{ width: isSidebarOpen ? 260 : 0, opacity: isSidebarOpen ? 1 : 0 }}
          className="h-full bg-white/80 backdrop-blur-xl border-r border-indigo-100/60 overflow-hidden shrink-0 shadow-[8px_0_40px_-20px_rgba(14,165,233,0.18)] hidden sm:block"
        >
          <div className="w-65 h-full flex flex-col">
            {/* New Chat Button */}
            <div className="p-3 border-b border-indigo-100/40">
              <Button
                onClick={createNewConversation}
                className="w-full justify-start gap-2 bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-md text-sm"
              >
                <Plus className="h-4 w-4" />
                Yangi suhbat
              </Button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <div className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wider">
                Suhbatlar
              </div>
              <div className="space-y-1">
                {conversations.map((conv) => {
                  const displayTitle = conv.title && conv.title !== "Yangi suhbat" 
                    ? conv.title 
                    : conv.last_message?.content 
                      ? conv.last_message.content.substring(0, 30) + (conv.last_message.content.length > 30 ? "..." : "")
                      : "Yangi suhbat";
                  
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        currentConversation?.id === conv.id
                          ? "bg-linear-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                          : "text-slate-600 hover:bg-indigo-50/50 hover:text-indigo-700"
                      }`}
                    >
                      <MessageSquare className={`h-4 w-4 shrink-0 ${currentConversation?.id === conv.id ? "text-white" : "text-slate-400"}`} />
                      <span className="flex-1 truncate text-sm font-medium">{displayTitle}</span>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                          currentConversation?.id === conv.id 
                            ? "hover:bg-white/20 text-white" 
                            : "hover:bg-red-50 text-red-500"
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Messages & Input Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
                {/* Welcome Screen */}
                {messages.length === 0 && !isLoading && (
                  <div className="text-center py-8 sm:py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-br from-blue-500 to-purple-600 mb-4 sm:mb-6 shadow-[0_16px_30px_-18px_rgba(2,132,199,0.7)]">
                      <Bot className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">AI Yordamchi</h2>
                    <p className="text-slate-600 mb-6 sm:mb-8 max-w-md mx-auto px-4">
                      Topshiriqlar, murojaatlar va hisobotlar haqida so'rang.
                    </p>
                    <div className="flex flex-wrap gap-2 sm:gap-3 justify-center px-4">
                      {[
                        { text: "📊 Holat", query: "Bugungi holat qanday?" },
                        { text: "⚠️ Muddati o'tgan", query: "Muddati o'tgan topshiriqlar nechta?" },
                        { text: "📈 Hisobot", query: "Haftalik hisobot yarat" }
                      ].map((item, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          onClick={() => quickChat(item.query)}
                          className="bg-white/80 border-indigo-100/60 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 shadow-sm text-xs sm:text-sm"
                        >
                          {item.text}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
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
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                          <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[75%] sm:max-w-[80%] ${message.role === "user" ? "order-1" : ""}`}>
                        <div className={`rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2.5 sm:py-4 shadow-md ${
                          message.role === "user"
                            ? "bg-linear-to-r from-blue-500 to-purple-600 text-white"
                            : "bg-white/90 backdrop-blur-xl border border-indigo-100/40 text-slate-800"
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
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors"
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
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-md">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Loading indicator */}
                {isSending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2 sm:gap-4"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                      <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div className="bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2.5 sm:py-4 border border-indigo-100/40 shadow-md">
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

          {/* Input Area */}
          <div className="p-3 sm:p-6 bg-white/50 backdrop-blur-xl border-t border-indigo-100/40 shrink-0">
            <div className="max-w-3xl mx-auto">
              {/* Recording indicator */}
              {isRecording && (
                <div className="mb-2 sm:mb-3 flex items-center gap-3 p-2 sm:p-3 rounded-xl bg-red-50 border border-red-200">
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm text-red-600 font-medium">Yozib olinmoqda: {formatTime(recordingTime)}</span>
                </div>
              )}

              {/* Audio preview */}
              {audioBlob && !isRecording && (
                <div className="mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                  <audio src={audioUrl || undefined} controls className="flex-1 h-7 sm:h-8" />
                  <Button size="sm" onClick={() => sendMessage(speechText)} disabled={isSending} className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm">
                    <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Yuborish</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetRecording} className="h-8 w-8">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Input field */}
              <div className="flex gap-2 items-end">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRecordToggle}
                  disabled={isSending}
                  className={`shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${
                    isRecording 
                      ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" 
                      : "border-indigo-100/60 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                  }`}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Xabar yozing..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={isSending || isRecording}
                    rows={1}
                    className="w-full bg-white/80 border-indigo-100/60 text-slate-800 placeholder:text-slate-400 resize-none min-h-10 sm:min-h-12 max-h-32 sm:max-h-50 pr-10 sm:pr-12 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm"
                  />
                </div>
                
                <Button
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || isSending || isRecording}
                  className="shrink-0 h-10 w-10 sm:h-11 sm:px-4 bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 rounded-xl shadow-md"
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
        </div>
      </div>
    </div>
  );
}
