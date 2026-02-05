"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  TrendingUp,
  Users,
  FileText,
  Zap,
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

const messageVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 25 }
  },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.1, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const }
  }
};

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

  const deleteConversation = useCallback(async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Ushbu suhbatni o'chirmoqchimisiz?")) return;
    
    try {
      await api.delete(`/ai/conversations/${conversationId}/`);
      
      // If deleted conversation was active, clear it
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      // Reload conversations list
      loadConversations();
    } catch (err) {
      console.error("Error deleting conversation:", err);
      alert("Suhbatni o'chirishda xatolik yuz berdi");
    }
  }, [currentConversation, loadConversations]);

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

    const intentConfig: Record<string, { gradient: string; label: string; icon: any }> = {
      CREATE_RECURRING_TASK: { 
        gradient: "from-emerald-500 to-teal-600", 
        label: "Takrorlanuvchi topshiriq",
        icon: FileText
      },
      EXPORT_ANALYTICS: { 
        gradient: "from-indigo-500 to-purple-600", 
        label: "Analitika eksport",
        icon: BarChart3
      },
      ANALYTICS_QUERY: { 
        gradient: "from-slate-500 to-slate-700", 
        label: "Analitika so'rov",
        icon: TrendingUp
      },
      CREATE_TASK: { 
        gradient: "from-green-500 to-emerald-600", 
        label: "Topshiriq yaratish",
        icon: Plus
      },
      CLOSE_TASK: { 
        gradient: "from-blue-500 to-cyan-600", 
        label: "Topshiriqni yopish",
        icon: CheckCircle2
      },
      GENERATE_REPORT: { 
        gradient: "from-purple-500 to-pink-600", 
        label: "Hisobot yaratish",
        icon: FileText
      },
      CLOSE_APPEAL: { 
        gradient: "from-orange-500 to-red-600", 
        label: "Murojaatni yopish",
        icon: Users
      },
      STATUS_CHECK: { 
        gradient: "from-gray-500 to-gray-700", 
        label: "Holat tekshirish",
        icon: Zap
      },
    };

    const config = intentConfig[intent] || { 
      gradient: "from-gray-500 to-gray-700", 
      label: intent,
      icon: Sparkles
    };
    
    const IconComponent = config.icon;

    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
      >
        <Badge className={`bg-gradient-to-r ${config.gradient} text-white text-xs border-0 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-1.5 px-2.5 py-1`}>
          <IconComponent className="h-3 w-3" />
          {config.label}
        </Badge>
      </motion.div>
    );
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col h-[calc(100vh-4rem)] gap-3 p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 overflow-hidden"
    >
      {/* Top section - Conversations + Chat + Stats */}
      <div className="flex flex-col lg:flex-row flex-1 gap-4 overflow-hidden min-h-0"
    >
      {/* Chap panel - Suhbatlar ro'yxati */}
      <motion.div 
        variants={itemVariants}
        className="w-full lg:w-80 flex flex-col"
      >
        <Card className="flex flex-col h-full backdrop-blur-xl bg-white/95 border-slate-200 shadow-2xl">
          <CardHeader className="pb-3 border-b border-slate-200 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
                <motion.div
                  animate={{ rotate: [0, 5, 0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  <Bot className="h-5 w-5 text-blue-600" />
                </motion.div>
                AI Yordamchi
              </CardTitle>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="sm" 
                  onClick={createNewConversation}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Yangi
                </Button>
              </motion.div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-3 min-h-0">
            <ScrollArea className="h-full w-full">
              {error ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                  <p className="text-sm text-red-600 font-semibold">{error}</p>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 border-red-200 hover:bg-red-50" 
                      onClick={loadConversations}
                    >
                      Qayta urinish
                    </Button>
                  </motion.div>
                </motion.div>
              ) : conversations.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <MessageSquare className="h-12 w-12 text-blue-400 mb-4" />
                  </motion.div>
                  <p className="text-sm text-slate-700 mb-3">Hali suhbatlar yo'q</p>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200" 
                      onClick={createNewConversation}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Yangi suhbat
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
              <AnimatePresence>
                <div className="space-y-2">
                  {conversations.map((conv, index) => (
                    <motion.div
                      key={conv.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      className={`group relative rounded-xl cursor-pointer transition-all duration-200 ${
                        currentConversation?.id === conv.id
                          ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-slate-900 ring-2 ring-blue-400/50 shadow-lg"
                          : "bg-white/60 hover:bg-white/90 hover:shadow-md border border-slate-100"
                      }`}
                    >
                      <div
                        onClick={() => selectConversation(conv)}
                        className="p-3 pr-12"
                      >
                        <div className="flex items-start gap-3">
                          <motion.div
                            animate={currentConversation?.id === conv.id ? { rotate: [0, 10, 0] } : {}}
                            transition={{ duration: 0.5 }}
                          >
                            <MessageSquare className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                              currentConversation?.id === conv.id ? "text-blue-600" : "text-slate-400"
                            }`} />
                          </motion.div>
                          <div className="min-w-0 flex-1">
                            <p className={`font-semibold truncate text-sm ${
                              currentConversation?.id === conv.id ? "text-blue-700" : "text-slate-800"
                            }`}>
                              {conv.title || "Yangi suhbat"}
                            </p>
                            {conv.last_message && (
                              <p className="text-xs opacity-60 truncate mt-1">
                                {conv.last_message.content}
                              </p>
                            )}
                            <p className="text-xs opacity-40 mt-1.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(conv.updated_at), {
                                addSuffix: true,
                                locale: uz,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Delete button */}
                      <motion.button
                        initial={{ opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all duration-200"
                        title="Suhbatni o'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* O'rta - Chat */}
      <motion.div 
        variants={itemVariants}
        className="flex-1 flex flex-col"
      >
        <Card className="h-full backdrop-blur-xl bg-white/95 border-slate-200 shadow-2xl">
          {currentConversation ? (
            <>
              <CardHeader className="pb-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    {currentConversation.title || "Yangi suhbat"}
                  </CardTitle>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <Badge 
                      variant="outline"
                      className={`${
                        currentConversation.status === "ACTIVE" 
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-300" 
                          : "bg-gray-500/10 text-gray-700 border-gray-300"
                      }`}
                    >
                      {currentConversation.status === "ACTIVE" ? "Faol" : "Yakunlangan"}
                    </Badge>
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && !isLoading && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                      >
                        <motion.div
                          animate={{ 
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 3,
                            ease: "easeInOut" 
                          }}
                        >
                          <Sparkles className="h-16 w-16 mx-auto text-blue-500 mb-4" />
                        </motion.div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                          AI Yordamchi tayyor
                        </h3>
                        <p className="text-slate-700 mb-8">
                          Topshiriqlar, murojaatlar va hisobotlar haqida so&apos;rang
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center">
                          {[
                            { emoji: "📊", text: "Bugungi holat", query: "Bugungi holat qanday?" },
                            { emoji: "⚠️", text: "Muddati o'tganlar", query: "Muddati o'tgan topshiriqlar nechta?" },
                            { emoji: "📈", text: "Haftalik hisobot", query: "Haftalik hisobot yarat" }
                          ].map((item, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => quickChat(item.query)}
                                className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border-blue-200 shadow-md"
                              >
                                <span className="text-lg mr-2">{item.emoji}</span>
                                {item.text}
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <AnimatePresence mode="popLayout">
                      {messages.map((message, index) => (
                        <motion.div
                          key={message.id}
                          variants={messageVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          transition={{ delay: index * 0.05 }}
                          className={`flex ${
                            message.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className={`max-w-[80%] rounded-2xl p-4 shadow-lg ${
                              message.role === "user"
                                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                                : "bg-white border border-slate-200"
                            }`}
                          >
                            {message.role === "assistant" && (
                              <div className="flex items-center gap-2 mb-2">
                                <motion.div
                                  animate={{ rotate: [0, 360] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                >
                                  <Bot className="h-5 w-5 text-blue-600" />
                                </motion.div>
                                <span className="text-sm font-semibold text-blue-700">AI Yordamchi</span>
                                {getIntentBadge(message.detected_intent)}
                              </div>
                            )}
                            <div className={`prose prose-sm max-w-none ${
                              message.role === "user" ? "text-white prose-invert" : "text-slate-800"
                            }`}>
                              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            {message.is_audio_message && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="mt-3"
                              >
                                <Badge 
                                  variant="secondary" 
                                  className="bg-white/20 text-white border-0"
                                >
                                  🎤 Audio xabar
                                </Badge>
                              </motion.div>
                            )}
                          </motion.div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {isSending && (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Loader2 className="h-5 w-5 text-blue-600" />
                            </motion.div>
                            <span className="text-sm font-semibold text-base">AI javob yozmoqda...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
            <div className="p-4 border-t border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
              {/* Audio Recording Status */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3"
                  >
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-xl border border-red-300 backdrop-blur-sm">
                      <motion.div
                        variants={pulseVariants}
                        animate="pulse"
                        className="h-4 w-4 bg-red-500 rounded-full"
                      />
                      <span className="text-sm text-red-600 text-red-600 font-semibold">
                        Yozib olinmoqda: {formatTime(recordingTime)}
                      </span>
                      {speechText && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-xs text-slate-700 ml-2 truncate flex-1 italic"
                        >
                          "{speechText}"
                        </motion.span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Audio Preview */}
              <AnimatePresence>
                {audioBlob && !isRecording && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-3"
                  >
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-300 backdrop-blur-sm">
                      <Mic className="h-5 w-5 text-blue-600" />
                      <audio src={audioUrl || undefined} controls className="h-8 flex-1" />
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          size="sm" 
                          onClick={sendAudioMessage} 
                          disabled={isSending}
                          className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
                        >
                          <Send className="h-3 w-3 mr-1" /> Yuborish
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="outline" size="sm" onClick={resetRecording}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex gap-2">
                <motion.div 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    onClick={handleRecordToggle}
                    disabled={isSending}
                    title={isRecording ? "To'xtatish" : "Ovozli xabar"}
                    className={`${
                      isRecording 
                        ? "bg-gradient-to-r from-red-500 to-pink-600 animate-pulse" 
                        : "hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10"
                    }`}
                  >
                    {isRecording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </motion.div>
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
                  className="min-h-[40px] max-h-32 resize-none overflow-y-auto bg-white border-slate-200 focus:border-blue-400 transition-all"
                />
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!inputMessage.trim() || isSending || isRecording}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
                  >
                    {isSending ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </motion.div>
              </div>
            </div>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex items-center justify-center p-8"
          >
            <div className="text-center max-w-md">
              <motion.div
                animate={{ 
                  y: [0, -20, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 4,
                  ease: "easeInOut"
                }}
                className="mb-6"
              >
                <Bot className="h-24 w-24 mx-auto text-blue-500" />
              </motion.div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                AI Yordamchi
              </h2>
              <p className="text-slate-700 mb-6 text-sm">
                Suhbat tanlang yoki yangi suhbat boshlang
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={createNewConversation}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Yangi suhbat
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </Card>
      </motion.div>

      {/* O'ng panel - Statistika */}
      <motion.div 
        variants={itemVariants}
        className="w-full lg:w-72 flex flex-col gap-4 lg:max-h-full overflow-y-auto"
      >
        <Card className="backdrop-blur-xl bg-white/95 border-slate-200 shadow-2xl">
          <CardHeader className="pb-3 border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Holat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {stats ? (
              <motion.div initial="hidden" animate="visible" variants={containerVariants}>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Topshiriqlar
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }}>
                      <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-200 p-3 shadow-md">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-xs text-blue-700 font-semibold text-base">Faol</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">{stats.tasks.active}</p>
                      </div>
                    </motion.div>
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }}>
                      <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-200 p-3 shadow-md">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-xs text-red-700 font-semibold text-base">O&apos;tgan</span>
                        </div>
                        <p className="text-2xl font-bold text-red-700">{stats.tasks.overdue}</p>
                      </div>
                    </motion.div>
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} className="col-span-2">
                      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/10 border border-emerald-200 p-3 shadow-md">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs text-emerald-700 font-semibold text-base">Bugun bajarildi</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700">{stats.tasks.completed_today}</p>
                      </div>
                    </motion.div>
                  </div>
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Tashkilotlar
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }}>
                      <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200 p-3 shadow-md">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart3 className="h-4 w-4 text-purple-600" />
                          <span className="text-xs text-purple-700 font-semibold text-base">Jami</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-700">{stats.organizations?.total ?? 0}</p>
                      </div>
                    </motion.div>
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }}>
                      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200 p-3 shadow-md">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs text-emerald-700 font-semibold text-base">Faol</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700">{stats.organizations?.active ?? 0}</p>
                      </div>
                    </motion.div>
                  </div>
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Murojaatlar
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }}>
                      <div className="rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-200 p-3 shadow-md">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="h-4 w-4 text-yellow-600" />
                          <span className="text-xs text-yellow-700 font-semibold text-base">Kutmoqda</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-700">{stats.appeals.pending}</p>
                      </div>
                    </motion.div>
                    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }}>
                      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-200 p-3 shadow-md">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs text-emerald-700 font-semibold text-base">Hal etildi</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700">{stats.appeals.resolved_today}</p>
                      </div>
                    </motion.div>
                  </div>
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Faoliyat
                  </h4>
                  <div className="space-y-2 text-sm">
                    <motion.div variants={itemVariants} className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                      <span className="text-slate-700">Suhbatlar</span>
                      <span className="font-bold text-blue-700">{stats.ai.conversations_today}</span>
                    </motion.div>
                    <motion.div variants={itemVariants} className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                      <span className="text-slate-700">Harakatlar</span>
                      <span className="font-bold text-purple-700">{stats.ai.actions_today}</span>
                    </motion.div>
                    <motion.div variants={itemVariants} className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-indigo-500/5 to-blue-500/5">
                      <span className="text-slate-700">Hisobotlar</span>
                      <span className="font-bold text-indigo-700">{stats.ai.reports_today}</span>
                    </motion.div>
                  </div>
                </div>

                {stats.alerts.high_risk_tasks > 0 && (
                  <>
                    <Separator className="bg-white/20" />
                    <motion.div 
                      variants={itemVariants}
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-500/10 to-pink-500/10 p-3 shadow-lg"
                    >
                      <div className="flex items-center gap-2 text-red-700">
                        <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                          <AlertCircle className="h-5 w-5" />
                        </motion.div>
                        <span className="text-sm font-bold">
                          {stats.alerts.high_risk_tasks} yuqori xavfli topshiriq
                        </span>
                      </div>
                    </motion.div>
                  </>
                )}
              </motion.div>
            ) : (
              <div className="flex justify-center py-8">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Loader2 className="h-8 w-8 text-blue-600" />
                </motion.div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>

      {/* Bottom section - FAQ horizontal layout */}
      <motion.div 
        variants={itemVariants}
        className="shrink-0"
      >
        <Card className="backdrop-blur-xl bg-white/95 border-slate-200 shadow-2xl">
          <CardHeader className="pb-2 border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-base bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Yo'riqnoma va FAQ
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 pb-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left side - Instructions */}
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <p className="text-slate-900 font-semibold text-sm flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                    Qanday so'rovlar berish mumkin?
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                    <li>"Topshiriqlar bo'yicha analitika"</li>
                    <li>"Tashkilotlar reyting va holat"</li>
                    <li>"Murojaatlar statistikasi"</li>
                    <li>"Analitika faylini PDF/xlsx"</li>
                  </ul>
                </div>
              </div>

              {/* Right side - FAQ Accordion */}
              <div className="space-y-2">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="faq-1" className="border-slate-200 py-0">
                    <AccordionTrigger className="hover:text-blue-600 text-left text-xs py-2">Analitika qanday olaman?</AccordionTrigger>
                    <AccordionContent className="text-slate-700 text-xs pb-2">
                      "Analitika" yoki "statistika" deb yozing.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="faq-2" className="border-slate-200 py-0">
                    <AccordionTrigger className="hover:text-blue-600 text-left text-xs py-2">Excel/PDF fayl olish?</AccordionTrigger>
                    <AccordionContent className="text-slate-700 text-xs pb-2">
                      "Analitika faylini xlsx/pdf" deb yozing.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="faq-3" className="border-slate-200 py-0">
                    <AccordionTrigger className="hover:text-blue-600 text-left text-xs py-2">Davrni ko'rsatish?</AccordionTrigger>
                    <AccordionContent className="text-slate-700 text-xs pb-2">
                      "Oxirgi 7 kun", "oxirgi 1 oy" yozing.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="faq-4" className="border-slate-200 py-0 border-b-0">
                    <AccordionTrigger className="hover:text-blue-600 text-left text-xs py-2">Qaysi bo'limlar?</AccordionTrigger>
                    <AccordionContent className="text-slate-700 text-xs pb-2">
                      Tashkilotlar, topshiriqlar, murojaatlar.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
