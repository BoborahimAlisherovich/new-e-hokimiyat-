"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Square,
  Play,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
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
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [speechText, setSpeechText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const speechFinalRef = useRef<string>("");
  const isRecordingRef = useRef<boolean>(false);

  // Audio recorder hook
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const sendMessage = async (overrideText?: string) => {
    const userMessage = (overrideText ?? inputMessage).trim();
    if (!userMessage || !currentConversation) return;

    setInputMessage("");
    setIsSending(true);

    // Optimistic update
    const tempUserMessage: AIMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await api.post<{ user_message: AIMessage; ai_message: AIMessage }>(
        `/ai/conversations/${currentConversation.id}/send_message/`,
        { message: userMessage }
      );

      // Replace temp message and add AI response
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
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript || "";
        if (result.isFinal) {
          finalChunks.push(text);
        }
      }
      if (finalChunks.length) {
        const combined = `${speechFinalRef.current} ${finalChunks.join(" ")}`.trim();
        speechFinalRef.current = combined;
        setSpeechText(combined);
        if (isRecordingRef.current) {
          setInputMessage(combined);
        }
      }
    };

    recognition.onerror = () => {
      setIsTranscribing(false);
    };

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
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      speechRecognitionRef.current = null;
    }
    setIsTranscribing(false);
  };

  const sendSpeechAsText = async () => {
    const rawText = speechText.trim();
    if (!rawText) return;
    const words = rawText.split(/\s+/);
    const deduped: string[] = [];
    for (const w of words) {
      if (deduped.length === 0 || deduped[deduped.length - 1].toLowerCase() !== w.toLowerCase()) {
        deduped.push(w);
      }
    }
    const text = deduped.join(" ");
    setSpeechText(text);
    setInputMessage(text);
  };

  // Audio xabar yuborish
  const sendAudioMessage = async () => {
    if (!audioBlob || !currentConversation) return;

    setIsSending(true);

    // Optimistic update
    const tempUserMessage: AIMessage = {
      id: `temp-audio-${Date.now()}`,
      role: "user",
      content: "🎤 Ovozli xabar yuborildi...",
      created_at: new Date().toISOString(),
      is_audio_message: true,
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      const response = await api.postFormData<{ user_message: AIMessage; ai_message: AIMessage; transcription: string }>(
        `/ai/conversations/${currentConversation.id}/send_audio/`,
        formData
      );

      // Replace temp message with transcribed message and AI response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        response.data.user_message,
        response.data.ai_message,
      ]);

      resetRecording();
    } catch (error) {
      console.error("Error sending audio:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      stopRecording();
      stopSpeechRecognition();
      resetRecording();
    } else {
      setSpeechText("");
      await startRecording();
      startSpeechRecognition();
    }
  };

  const quickChat = useCallback(async (message: string) => {
    if (!currentConversation) {
      await createNewConversation();
    }
    setInputMessage(message);
  }, [currentConversation, createNewConversation]);

  const selectConversation = useCallback((conv: AIConversation) => {
    setCurrentConversation(conv);
    loadConversationMessages(conv.id);
  }, [loadConversationMessages]);

  const getIntentBadge = (intent?: string) => {
    if (!intent || intent === "UNKNOWN") return null;

    const intentColors: Record<string, string> = {
      CREATE_RECURRING_TASK: "bg-emerald-500",
      EXPORT_ANALYTICS: "bg-indigo-500",
      ANALYTICS_QUERY: "bg-slate-500",
      CREATE_TASK: "bg-green-500",
      CLOSE_TASK: "bg-blue-500",
      GENERATE_REPORT: "bg-purple-500",
      CLOSE_APPEAL: "bg-orange-500",
      STATUS_CHECK: "bg-gray-500",
    };

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
      <Badge className={`${intentColors[intent] || "bg-gray-500"} text-white text-xs`}>
        {intentLabels[intent] || intent}
      </Badge>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Chap panel - Suhbatlar ro'yxati */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              AI Yordamchi
            </CardTitle>
            <Button size="sm" onClick={createNewConversation}>
              <Plus className="h-4 w-4 mr-1" />
              Yangi
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-2">
          <ScrollArea className="h-full">
            {error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={loadConversations}>
                  Qayta urinish
                </Button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Hali suhbatlar yo'q</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={createNewConversation}>
                  <Plus className="h-4 w-4 mr-1" />
                  Yangi suhbat
                </Button>
              </div>
            ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentConversation?.id === conv.id
                      ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {conv.title || "Yangi suhbat"}
                      </p>
                      {conv.last_message && (
                        <p className="text-xs opacity-70 truncate">
                          {conv.last_message.content}
                        </p>
                      )}
                      <p className="text-xs opacity-50 mt-1">
                        {formatDistanceToNow(new Date(conv.updated_at), {
                          addSuffix: true,
                          locale: uz,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* O'rta - Chat */}
      <Card className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {currentConversation.title || "Yangi suhbat"}
                </CardTitle>
                <Badge variant="outline">
                  {currentConversation.status === "ACTIVE" ? "Faol" : "Yakunlangan"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.length === 0 && !isLoading && (
                    <div className="text-center py-12">
                      <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        AI Yordamchi tayyor
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Topshiriqlar, murojaatlar va hisobotlar haqida so&apos;rang
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickChat("Bugungi holat qanday?")}
                        >
                          📊 Bugungi holat
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickChat("Muddati o'tgan topshiriqlar nechta?")}
                        >
                          ⚠️ Muddati o&apos;tganlar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickChat("Haftalik hisobot yarat")}
                        >
                          📈 Haftalik hisobot
                        </Button>
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-primary/10 text-foreground border border-primary/20"
                            : "bg-muted"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-2 mb-1">
                            <Bot className="h-4 w-4" />
                            <span className="text-xs font-medium">AI Yordamchi</span>
                            {getIntentBadge(message.detected_intent)}
                          </div>
                        )}
                        <div className="prose prose-sm max-w-none text-foreground">
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        {message.is_audio_message && (
                          <Badge variant="secondary" className="mt-2">
                            🎤 Audio xabar
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">AI javob yozmoqda...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <div className="p-4 border-t">
              {/* Audio Recording Status */}
              {isRecording && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                    Yozib olinmoqda: {formatTime(recordingTime)}
                  </span>
                  {speechText && (
                    <span className="text-xs text-muted-foreground ml-2 truncate flex-1">
                      "{speechText}"
                    </span>
                  )}
                </div>
              )}
              
              {/* Audio Preview */}
              {audioBlob && !isRecording && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Mic className="h-4 w-4 text-blue-600" />
                  <audio src={audioUrl || undefined} controls className="h-8 flex-1" />
                  <Button size="sm" onClick={sendAudioMessage} disabled={isSending}>
                    <Send className="h-3 w-3 mr-1" /> Yuborish
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetRecording}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  onClick={handleRecordToggle}
                  disabled={isSending}
                  title={isRecording ? "To'xtatish" : "Ovozli xabar"}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
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
                  className="min-h-[40px] max-h-32 resize-none overflow-y-auto bg-background text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || isSending || isRecording}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">AI Yordamchi</h2>
              <p className="text-muted-foreground mb-4">
                Suhbat tanlang yoki yangi suhbat boshlang
              </p>
              <Button onClick={createNewConversation}>
                <Plus className="h-4 w-4 mr-2" />
                Yangi suhbat
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* O'ng panel - Statistika + Yo'riqnoma + FAQ */}
      <div className="w-72 flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Holat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats ? (
              <>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Topshiriqlar</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Faol</span>
                      </div>
                      <p className="text-2xl font-semibold text-foreground">{stats.tasks.active}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">O&apos;tgan</span>
                      </div>
                      <p className="text-2xl font-semibold text-foreground">{stats.tasks.overdue}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3 col-span-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Bugun bajarildi</span>
                      </div>
                      <p className="text-2xl font-semibold text-foreground">
                        {stats.tasks.completed_today}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Tashkilotlar</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Jami</span>
                      </div>
                      <p className="text-2xl font-semibold text-foreground">
                        {stats.organizations?.total ?? 0}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Faol</span>
                      </div>
                      <p className="text-2xl font-semibold text-foreground">
                        {stats.organizations?.active ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Murojaatlar</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Kutmoqda</span>
                      </div>
                      <p className="text-2xl font-semibold text-foreground">
                        {stats.appeals.pending}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Hal etildi</span>
                      </div>
                      <p className="text-2xl font-semibold text-foreground">
                        {stats.appeals.resolved_today}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">AI Faoliyat</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Suhbatlar</span>
                      <span className="font-medium">{stats.ai.conversations_today}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Harakatlar</span>
                      <span className="font-medium">{stats.ai.actions_today}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hisobotlar</span>
                      <span className="font-medium">{stats.ai.reports_today}</span>
                    </div>
                  </div>
                </div>

                {stats.alerts.high_risk_tasks > 0 && (
                  <>
                    <Separator />
                    <div className="rounded-lg border border-red-200/60 bg-red-50/60 p-3 dark:border-red-900/40 dark:bg-red-950/40">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {stats.alerts.high_risk_tasks} yuqori xavfli topshiriq
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              Yo'riqnoma va FAQ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="space-y-2">
              <p className="text-foreground font-medium">Qanday so'rovlar berish mumkin?</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>“Topshiriqlar bo'yicha analitika (oxirgi 30 kun)”</li>
                <li>“Tashkilotlar kesimida reyting va holat”</li>
                <li>“Murojaatlar va foydalanuvchilar statistikasi”</li>
                <li>“Analitika faylini PDF qilib chiqar”</li>
              </ul>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger>Analitika xabarlarini qanday olaman?</AccordionTrigger>
                <AccordionContent>
                  “Analitika” yoki “statistika” deb yozing. Masalan: “Topshiriqlar analitikasi”.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2">
                <AccordionTrigger>Excel yoki PDF fayl olish mumkinmi?</AccordionTrigger>
                <AccordionContent>
                  Ha. “Analitika faylini xlsx/pdf” deb yozing — yuklab olish havolasi beriladi.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-3">
                <AccordionTrigger>Davrni qanday ko'rsataman?</AccordionTrigger>
                <AccordionContent>
                  “Oxirgi 7 kun”, “oxirgi 1 oy” kabi yozing.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-4">
                <AccordionTrigger>Qaysi bo'limlar bo'yicha so'rov berish mumkin?</AccordionTrigger>
                <AccordionContent>
                  Tashkilotlar, topshiriqlar, murojaatlar, foydalanuvchilar bo'yicha.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
