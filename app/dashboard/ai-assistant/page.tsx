"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Bot,
  Send,
  Plus,
  MessageSquare,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  FileText,
  Zap,
  Maximize2,
  Minimize2,
  Paperclip,
  Image as ImageIcon,
  Video,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { API_BASE, getAccessToken, getRefreshToken, setAccessToken } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import { useAudioRecorder, formatTime } from "@/hooks/use-audio-recorder";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Header } from "@/components/layout/header";
import { useGSAPPageEntrance } from "@/hooks/use-gsap";

interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  detected_intent?: string;
  is_audio_message?: boolean;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_content_type?: string | null;
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

interface AIStats {
  tasks: {
    active: number;
    overdue: number;
    completed_today: number;
  };
  organizations: {
    total: number;
    active: number;
  };
  appeals: {
    pending: number;
    resolved_today: number;
  };
  ai: {
    conversations_today: number;
    actions_today: number;
    reports_today: number;
  };
  alerts: {
    high_risk_tasks: number;
  };
}

export default function AIAssistantPage() {
  const pageRef = useGSAPPageEntrance();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [statsCollapsed, setStatsCollapsed] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [speechText, setSpeechText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
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
    error: audioError,
  } = useAudioRecorder();

  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get<AIConversation[] | { results: AIConversation[] }>("/ai/conversations/");
      const data = response.data;
      const items = Array.isArray(data) ? data : data?.results || [];
      setConversations(items);
    } catch (err) {
      console.error("Error loading conversations:", err);
      setError("Suhbatlarni yuklashda xatolik");
      setConversations([]);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get<AIStats>("/ai/status/");
      setStats(response.data);
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadStats();
  }, [loadConversations, loadStats]);

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
    // Faqat audio yozuvi bo'lmagan holatda speech text ni inputga qo'yamiz
    if (!isRecording && speechText.trim() && !audioBlob) {
      setInputMessage(speechText.trim());
    }
  }, [isRecording, speechText, audioBlob]);

  useEffect(() => {
    if (!isMaximized) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMaximized(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized]);

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
    if (isCreatingConversation) return; // Prevent duplicate requests
    
    setIsCreatingConversation(true);
    try {
      const response = await api.post<AIConversation>("/ai/conversations/", { title: "Yangi suhbat" });
      setCurrentConversation(response.data);
      setMessages([]);
      loadConversations();
      toast({
        title: "Muvaffaqiyat",
        description: "Yangi suhbat yaratildi",
      });
      return response.data;
    } catch (err: any) {
      console.error("Error creating conversation:", err);
      const errorMsg = err?.response?.data?.detail || 
                       err?.response?.data?.message || 
                       (err instanceof Error ? err.message : "Suhbat yaratishda xatolik yuz berdi");
      toast({
        title: "Xatolik",
        description: errorMsg,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCreatingConversation(false);
    }
  }, [loadConversations, toast, isCreatingConversation]);

  const ensureConversation = useCallback(async () => {
    if (currentConversation) return currentConversation;
    return createNewConversation();
  }, [createNewConversation, currentConversation]);

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
      alert("Suhbatni o'chirishda xatolik yuz berdi");
    }
  }, [currentConversation, loadConversations]);

  const sendMessage = async (overrideText?: string) => {
    const userMessage = (overrideText ?? inputMessage).trim();
    const conversation = await ensureConversation();
    if ((!userMessage && !pendingAttachment) || !conversation) return;

    setInputMessage("");
    setIsSending(true);

    const tempUserMessage: AIMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage || pendingAttachment?.name || "Fayl yuborildi",
      created_at: new Date().toISOString(),
      attachment_name: pendingAttachment?.name || null,
      attachment_content_type: pendingAttachment?.type || null,
    };
    shouldScrollRef.current = true;
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      let response;
      if (pendingAttachment) {
        const formData = new FormData();
        if (userMessage) formData.append("message", userMessage);
        formData.append("attachment", pendingAttachment);
        response = await api.postFormData<{ user_message: AIMessage; ai_message: AIMessage }>(
          `/ai/conversations/${conversation.id}/send_message/`,
          formData
        );
      } else {
        response = await api.post<{ user_message: AIMessage; ai_message: AIMessage }>(
          `/ai/conversations/${conversation.id}/send_message/`,
          { message: userMessage }
        );
      }
      shouldScrollRef.current = true;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        response.data.user_message,
        response.data.ai_message,
      ]);
      setPendingAttachment(null);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
      loadConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const startSpeechRecognition = () => {
    if (!speechSupported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

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

    recognition.onerror = () => setIsTranscribing(false);
    recognition.onend = () => {
      setIsTranscribing(false);
      if (speechFinalRef.current.trim()) {
        setInputMessage((prev) => (prev.trim() ? prev : speechFinalRef.current.trim()));
      }
    };

    speechFinalRef.current = "";
    recognition.start();
    speechRecognitionRef.current = recognition;
    setIsTranscribing(true);
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      speechRecognitionRef.current = null;
    }
    setIsTranscribing(false);
  };

  const getAudioFilename = (blob: Blob) => {
    const mime = blob.type || "audio/webm";
    if (mime.includes("mp4")) return "audio.mp4";
    if (mime.includes("ogg")) return "audio.ogg";
    if (mime.includes("mpeg") || mime.includes("mp3")) return "audio.mp3";
    if (mime.includes("wav")) return "audio.wav";
    return "audio.webm";
  };

  const sendAudioMessage = async () => {
    const conversation = await ensureConversation();
    if (!audioBlob || !conversation) return;
    setIsSending(true);

    const tempUserMessage: AIMessage = {
      id: `temp-audio-${Date.now()}`,
      role: "user",
      content: "Ovozli xabar yuborildi...",
      created_at: new Date().toISOString(),
      is_audio_message: true,
    };
    shouldScrollRef.current = true;
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, getAudioFilename(audioBlob));
      if (speechText.trim()) {
        formData.append("transcript", speechText.trim());
      }
      const response = await api.postFormData<{ user_message: AIMessage; ai_message: AIMessage; transcription: string }>(
        `/ai/conversations/${conversation.id}/send_audio/`,
        formData
      );
      shouldScrollRef.current = true;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        response.data.user_message,
        response.data.ai_message,
      ]);
      resetRecording();
      setSpeechText("");
      setInputMessage("");
      loadConversations();
    } catch (error) {
      console.error("Error sending audio:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      stopSpeechRecognition();
      stopRecording();
    } else {
      resetRecording();
      setSpeechText("");
      setInputMessage("");
      await startRecording();
      startSpeechRecognition();
    }
  };

  const quickChat = useCallback(async (message: string) => {
    if (!currentConversation) await createNewConversation();
    setInputMessage(message);
  }, [currentConversation, createNewConversation]);

  const getAttachmentKind = (message: AIMessage) => {
    const contentType = message.attachment_content_type || "";
    if (contentType.startsWith("image/")) return "image";
    if (contentType.startsWith("video/")) return "video";
    if (contentType.startsWith("audio/")) return "audio";
    return "file";
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingAttachment(file);
  };

  const selectConversation = useCallback((conv: AIConversation) => {
    setCurrentConversation(conv);
    loadConversationMessages(conv.id);
  }, [loadConversationMessages]);

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
    return (
      <Badge className="bg-blue-50 text-blue-600 text-xs border-blue-100">
        {intentLabels[intent] || intent}
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
    setDownloadingReportId(reportId);
    const url = `${API_BASE}/ai/reports/${reportId}/download/`;
    
    const doFetch = async (token: string | null) => {
      return fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    };

    try {
      let token = getAccessToken();
      let response = await doFetch(token);

      // Token muddati tugagan bo'lsa, yangilashga harakat qilamiz
      if (response.status === 401) {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${API_BASE}/auth/token/refresh/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh: refreshToken }),
            });
            if (refreshRes.ok) {
              const data = await refreshRes.json();
              setAccessToken(data.access);
              token = data.access;
              response = await doFetch(token);
            }
          } catch {
            // refresh failed, continue with original 401 response
          }
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          response.status === 401
            ? "Sessiya muddati tugadi. Sahifani yangilang."
            : response.status === 404
            ? "Hisobot topilmadi."
            : `Yuklab olish xatosi (${response.status}): ${errorText || "Server xatosi"}`
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        throw new Error("Server PDF qaytarmadi. Iltimos, qayta urinib ko'ring.");
      }

      const blob = await response.blob();
      const link = document.createElement("a");
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = `hisobot-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // URL ni kechiktirib tozalaymiz, brauzer yuklab olishni boshlashi uchun
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);

      toast({
        title: "Muvaffaqiyat",
        description: "Hisobot muvaffaqiyatli yuklandi",
      });
    } catch (err: any) {
      console.error("PDF download error:", err);
      toast({
        title: "Xatolik",
        description: err?.message || "PDF yuklab olishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setDownloadingReportId(null);
    }
  };

  return (
    <>
      <Header title="AI Yordamchi" description="Sun'iy intellekt yordamchisi bilan suhbatlashing" />
      <div ref={pageRef} className="p-4 sm:p-6">
        <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-425 flex-col gap-3">
          <section
            data-gsap-section
            className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(239,246,255,0.94),rgba(240,249,255,0.9))] p-4 shadow-[0_24px_80px_-32px_rgba(14,165,233,0.35)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Interactive Workspace</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                AI yordamchini to&apos;liq ekran, audio va media bilan boshqaring
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Tezkor topshiriq, hisobot va fayl bilan ishlash bir joyda.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                data-gsap-action
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsMaximized((prev) => !prev)}
                className="h-10 rounded-2xl border-sky-100 bg-white/80 px-4 text-slate-700 shadow-sm hover:bg-sky-50"
              >
                {isMaximized ? (
                  <Minimize2 className="mr-2 h-4 w-4" />
                ) : (
                  <Maximize2 className="mr-2 h-4 w-4" />
                )}
                {isMaximized ? "Minimize" : "Maksimize"}
              </Button>
              <Button
                data-gsap-action
                type="button"
                size="sm"
                onClick={createNewConversation}
                disabled={isCreatingConversation}
                className="h-10 rounded-2xl bg-linear-to-r from-sky-600 via-blue-600 to-cyan-500 px-4 text-white shadow-[0_16px_30px_-18px_rgba(2,132,199,0.7)] hover:from-sky-700 hover:via-blue-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingConversation ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {isCreatingConversation ? "Yaratilmoqda..." : "Yangi suhbat"}
              </Button>
            </div>
          </section>
          <section
            data-gsap-section
            className={`grid flex-1 min-h-0 gap-3 ${
              statsCollapsed
                ? "xl:grid-cols-[230px_minmax(0,1fr)]"
                : "xl:grid-cols-[230px_minmax(0,1fr)] 2xl:grid-cols-[230px_minmax(0,1fr)_280px]"
            }`}
          >
        
            {/* Left sidebar - Conversations */}
            <div className="min-h-55 xl:h-full xl:min-h-0">
          <Card data-gsap-card className="h-full flex flex-col bg-white/75 backdrop-blur-xl border-white/50 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] ring-1 ring-indigo-50/30">
            <CardHeader className="py-2.5 px-3 border-b border-indigo-100/40 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Bot className="h-4 w-4 text-blue-600" />
                  Suhbatlar
                </CardTitle>
                <Button 
                  size="sm" 
                  onClick={createNewConversation}
                  disabled={isCreatingConversation}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingConversation ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3 mr-1" />
                  )}
                  {isCreatingConversation ? "..." : "Yangi"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-2 min-h-0 overflow-y-auto">
                {error ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
                    <p className="text-xs text-red-600">{error}</p>
                    <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={loadConversations}>
                      Qayta urinish
                    </Button>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500 mb-2">Hali suhbatlar yo'q</p>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={createNewConversation}>
                      <Plus className="h-3 w-3 mr-1" />
                      Yangi suhbat
                    </Button>
                  </div>
                ) : (
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
                          className={`relative flex items-center gap-2 rounded-lg cursor-pointer transition-colors p-2 ${
                            currentConversation?.id === conv.id
                              ? "bg-blue-50 border border-blue-200"
                              : "hover:bg-indigo-50/30 border border-transparent"
                          }`}
                          onClick={() => selectConversation(conv)}
                        >
                          <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${
                            currentConversation?.id === conv.id ? "text-blue-600" : "text-slate-400"
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-medium truncate ${
                              currentConversation?.id === conv.id ? "text-blue-700" : "text-slate-700"
                            }`}>
                              {displayTitle}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: uz })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id, e);
                            }}
                            className="shrink-0 p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Main chat area */}
        <div className={isMaximized ? "contents" : "min-h-[55vh] xl:min-h-0"}>
          {isMaximized && (
            <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm" onClick={() => setIsMaximized(false)} />
          )}
          <Card
            data-gsap-card
            className={`flex flex-col overflow-hidden bg-white/75 backdrop-blur-xl border-white/50 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] ring-1 ring-indigo-50/30 ${
              isMaximized
                ? "fixed inset-3 z-50 h-[calc(100vh-1.5rem)] rounded-3xl border-sky-100/80 bg-white/92 shadow-[0_30px_120px_-30px_rgba(15,23,42,0.45)]"
                : "h-full"
            }`}
          >
            {currentConversation ? (
              <>
                <CardHeader className="pb-3 border-b border-indigo-100/40 shrink-0 bg-indigo-50/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="max-w-45 truncate text-base font-semibold text-slate-800 sm:max-w-[320px]">
                      {currentConversation.title || "Yangi suhbat"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${
                        currentConversation.status === "ACTIVE" 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                          : "bg-indigo-50/30 text-slate-500 border-indigo-100/40"
                      }`}>
                        {currentConversation.status === "ACTIVE" ? "Faol" : "Yakunlangan"}
                      </Badge>
                      <Button
                        data-gsap-action
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStatsCollapsed((prev) => !prev)}
                        className="hidden 2xl:inline-flex h-8 px-2.5 text-xs"
                      >
                        <BarChart3 className="h-3.5 w-3.5 mr-1" />
                        {statsCollapsed ? "AI faollik" : "Yopish"}
                        {statsCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        ) : (
                          <ChevronLeft className="h-3.5 w-3.5 ml-1" />
                        )}
                      </Button>
                      <Button
                        data-gsap-action
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsMaximized((prev) => !prev)}
                        className="h-8 px-2.5 text-xs"
                      >
                        {isMaximized ? (
                          <Minimize2 className="h-3.5 w-3.5" />
                        ) : (
                          <Maximize2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
                      {messages.length === 0 && !isLoading && (
                        <div className="text-center py-12">
                          <Sparkles className="h-12 w-12 mx-auto text-blue-400 mb-4" />
                          <h3 className="text-lg font-semibold text-slate-800 mb-2">AI Yordamchi tayyor</h3>
                          <p className="text-sm text-slate-500 mb-6">
                            Topshiriqlar, murojaatlar va hisobotlar haqida so'rang
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {[
                              { text: "Bugungi holat", query: "Bugungi holat qanday?" },
                              { text: "Muddati o'tganlar", query: "Muddati o'tgan topshiriqlar nechta?" },
                              { text: "Haftalik hisobot", query: "Haftalik hisobot yarat" }
                            ].map((item, i) => (
                              <Button
                                key={i}
                                variant="outline"
                                size="sm"
                                onClick={() => quickChat(item.query)}
                                className="text-xs bg-white hover:bg-blue-50 border-indigo-100/40"
                              >
                                {item.text}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[96%] rounded-2xl p-3 sm:max-w-[94%] sm:p-4 lg:max-w-[90%] xl:max-w-[86%] ${
                            message.role === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-indigo-50/50 border border-indigo-100/40"
                          }`}>
                            {message.role === "assistant" && (
                              <div className="flex items-center gap-2 mb-2">
                                <Bot className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-slate-700">AI Yordamchi</span>
                                {getIntentBadge(message.detected_intent)}
                              </div>
                            )}
                            <div className={`prose prose-sm max-w-none ${
                              message.role === "user" ? "text-white" : "text-slate-700"
                            }`}>
                              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                {sanitizeReportContent(message.content)}
                              </ReactMarkdown>
                            </div>
                            {message.role === "assistant" && extractReportId(message.content) && (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  disabled={downloadingReportId === extractReportId(message.content)}
                                  onClick={() => downloadReportPdfById(extractReportId(message.content)!)}
                                  className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {downloadingReportId === extractReportId(message.content) ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <FileText className="h-3.5 w-3.5" />
                                  )}
                                  {downloadingReportId === extractReportId(message.content) ? "Yuklanmoqda..." : "PDF yuklab olish"}
                                </button>
                              </div>
                            )}
                            {message.attachment_url && (
                              <div className="mt-3">
                                {getAttachmentKind(message) === "image" ? (
                                  <a href={message.attachment_url} target="_blank" rel="noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={message.attachment_url}
                                      alt={message.attachment_name || "Rasm"}
                                      className="max-h-72 rounded-xl border border-slate-200 object-cover"
                                    />
                                  </a>
                                ) : getAttachmentKind(message) === "video" ? (
                                  <video
                                    src={message.attachment_url}
                                    controls
                                    className="max-h-72 w-full rounded-xl border border-slate-200 bg-slate-950"
                                  />
                                ) : getAttachmentKind(message) === "audio" ? (
                                  <audio src={message.attachment_url} controls className="w-full" />
                                ) : (
                                  <a
                                    href={message.attachment_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    {message.attachment_name || "Faylni ochish"}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {isSending && (
                        <div className="flex justify-start">
                          <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/40">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              <span className="text-sm text-slate-500">AI javob yozmoqda...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>
                <div className="p-4 border-t border-indigo-100/40 bg-indigo-50/30 shrink-0">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {[
                      "Tezkor topshiriq yarat: bugun suv ta'minoti holatini tekshirish",
                      "Tezkor topshiriq yarat: barcha maktablarga haftalik hisobot topshirish",
                      "Haftalik hisobot yarat",
                    ].map((prompt) => (
                      <Button
                        key={prompt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInputMessage(prompt)}
                        className="h-8 rounded-full border-sky-100 bg-white/70 px-3 text-[11px] text-slate-600 hover:bg-sky-50"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                  {isRecording && (
                    <div className="mb-3 flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                      <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm text-red-600">Yozib olinmoqda: {formatTime(recordingTime)}</span>
                    </div>
                  )}
                  {audioBlob && !isRecording && (
                    <div className="mb-3 flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <Mic className="h-4 w-4 text-blue-600" />
                      <audio src={audioUrl || undefined} controls className="h-8 flex-1" />
                      <Button size="sm" onClick={sendAudioMessage} disabled={isSending} className="h-7 text-xs">
                        <Send className="h-3 w-3 mr-1" /> Yuborish
                      </Button>
                      <Button variant="outline" size="sm" onClick={resetRecording} className="h-7 text-xs">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {pendingAttachment && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
                      {pendingAttachment.type.startsWith("image/") ? (
                        <ImageIcon className="h-4 w-4 text-sky-600" />
                      ) : pendingAttachment.type.startsWith("video/") ? (
                        <Video className="h-4 w-4 text-sky-600" />
                      ) : (
                        <FileText className="h-4 w-4 text-sky-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-700">{pendingAttachment.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {(pendingAttachment.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPendingAttachment(null);
                          if (attachmentInputRef.current) attachmentInputRef.current.value = "";
                        }}
                        className="h-8 w-8 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      className="hidden"
                      onChange={handleAttachmentChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={isSending || isRecording}
                      className="h-10 w-10 shrink-0"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="icon"
                      onClick={handleRecordToggle}
                      disabled={isSending}
                      className="h-10 w-10 shrink-0"
                    >
                      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
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
                      className="min-h-11 flex-1 max-h-32 resize-none rounded-2xl border-indigo-100/60 bg-white"
                    />
                    <Button
                      onClick={() => sendMessage()}
                      disabled={(!inputMessage.trim() && !pendingAttachment) || isSending || isRecording}
                      className="h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700"
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <Bot className="h-16 w-16 mx-auto text-blue-400 mb-4" />
                  <h2 className="text-xl font-semibold text-slate-800 mb-2">AI Yordamchi</h2>
                  <p className="text-sm text-slate-500 mb-6">Suhbat tanlang yoki yangi suhbat boshlang</p>
                  <Button 
                    onClick={createNewConversation} 
                    disabled={isCreatingConversation}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingConversation ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {isCreatingConversation ? "Yaratilmoqda..." : "Yangi suhbat"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right sidebar - Stats */}
        {!statsCollapsed && (
        <div className="hidden 2xl:block">
          <Card data-gsap-card className="h-full bg-white/75 backdrop-blur-xl border-white/50 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] ring-1 ring-indigo-50/30">
            <CardHeader className="pb-3 border-b border-indigo-100/40">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                AI Faoliyat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {stats ? (
                <>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-blue-100">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Bugungi suhbatlar</p>
                          <p className="text-xl font-bold text-blue-700">{stats.ai.conversations_today}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-violet-50 border border-violet-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Zap className="h-3.5 w-3.5 text-violet-600" />
                          <span className="text-xs text-violet-600">Harakatlar</span>
                        </div>
                        <p className="text-lg font-bold text-violet-700">{stats.ai.actions_today}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="text-xs text-indigo-600">Hisobotlar</span>
                        </div>
                        <p className="text-lg font-bold text-indigo-700">{stats.ai.reports_today}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">AI imkoniyatlari</h4>
                    <div className="space-y-1.5">
                      {[
                        "Topshiriqlar analitikasi",
                        "Hisobot yaratish (PDF/XLSX)",
                        "Tashkilotlar holati",
                        "Murojaatlar statistikasi",
                        "Ovozli buyruqlar"
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {stats.alerts.high_risk_tasks > 0 && (
                    <>
                      <Separator />
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">{stats.alerts.high_risk_tasks} yuqori xavfli</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}
      </section>

      {/* Bottom FAQ section */}
      <section data-gsap-section>
      <Card data-gsap-card className="bg-white/75 backdrop-blur-xl border-white/50 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] ring-1 ring-indigo-50/30 shrink-0">
        <CardHeader className="py-3 border-b border-indigo-100/40">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Sparkles className="h-4 w-4 text-violet-600" />
            Yo'riqnoma va FAQ
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Qanday so'rovlar berish mumkin?</p>
              <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-500">
                <li>"Topshiriqlar bo'yicha analitika"</li>
                <li>"Tashkilotlar reyting va holat"</li>
                <li>"Murojaatlar statistikasi"</li>
                <li>"Analitika faylini PDF/xlsx"</li>
              </ul>
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1" className="border-slate-100 py-0">
                <AccordionTrigger className="hover:text-blue-600 text-left text-xs py-1.5">Analitika qanday olaman?</AccordionTrigger>
                <AccordionContent className="text-slate-500 text-xs pb-2">"Analitika" yoki "statistika" deb yozing.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2" className="border-slate-100 py-0">
                <AccordionTrigger className="hover:text-blue-600 text-left text-xs py-1.5">Excel/PDF fayl olish?</AccordionTrigger>
                <AccordionContent className="text-slate-500 text-xs pb-2">"Analitika faylini xlsx/pdf" deb yozing.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>
      </section>
        </div>
      </div>
    </>
  );
}
