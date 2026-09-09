"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Bot, 
  Settings, 
  Users, 
  MessageSquare, 
  MapPin, 
  BarChart3,
  Save,
  RefreshCw,
  Link,
  Unlink,
  Brain,
  Bell,
  Folder,
  Play,
  Square,
  Circle,
  AlertCircle,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useGSAPPageEntrance } from "@/hooks/use-gsap";
import { AdminOnly } from "@/components/auth/admin-only";

interface BotSettings {
  id: number;
  bot_token: string;
  bot_username: string;
  webhook_url: string;
  use_webhook: boolean;
  is_active: boolean;
  ai_provider: string;
  ai_api_key: string;
  ai_model: string;
  auto_response_enabled: boolean;
  auto_response_timeout_minutes: number;
  has_token: boolean;
  has_ai_key: boolean;
  welcome_message_uz: string;
  welcome_message_ru: string;
  welcome_message_en: string;
  about_text_uz: string;
  about_text_ru: string;
  about_text_en: string;
  help_text_uz: string;
  help_text_ru: string;
  help_text_en: string;
}

interface BotStats {
  total_users: number;
  registered_users: number;
  total_appeals: number;
  pending_appeals: number;
  approved_appeals: number;
  rejected_appeals: number;
  forwarded_appeals: number;
  today_appeals: number;
  this_week_appeals: number;
  this_month_appeals: number;
}

type WebhookInfo = {
  url?: string;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
}

type AIProvider = "disabled" | "openai" | "anthropic";

const AI_DEFAULT_MODELS: Record<Exclude<AIProvider, "disabled">, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
};

function getDefaultAIModel(provider: AIProvider) {
  if (provider === "disabled") return "";
  return AI_DEFAULT_MODELS[provider];
}

export default function TelegramBotPage() {
  const router = useRouter();
  const { toast } = useToast();
  const pageRef = useGSAPPageEntrance();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [stats, setStats] = useState<BotStats | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [preferredAIProvider, setPreferredAIProvider] = useState<Exclude<AIProvider, "disabled">>("openai");
  const [botStatus, setBotStatus] = useState<{
    is_active: boolean;
    is_running: boolean;
    use_webhook: boolean;
    pid: number | null;
  } | null>(null);

  const syncSettingsWithStatus = useCallback(
    (status: { is_active: boolean; is_running: boolean; use_webhook: boolean; pid: number | null }) => {
      setBotStatus(status);
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              is_active: status.is_active,
              use_webhook: status.use_webhook,
            }
          : prev
      );
    },
    []
  );

  const loadStatus = useCallback(async () => {
    const statusRes = await api.get<{ is_active: boolean; is_running: boolean; use_webhook: boolean; pid: number | null }>(
      "/telegram-bot/settings/bot_status/"
    );
    syncSettingsWithStatus(statusRes.data);
  }, [syncSettingsWithStatus]);

  const loadWebhookInfo = useCallback(async () => {
    if (!settings?.bot_token && !settings?.has_token) return;
    try {
      const response = await api.get<{ success: boolean; result?: WebhookInfo }>("/telegram-bot/settings/webhook_info/");
      if (response.data.success && response.data.result) setWebhookInfo(response.data.result);
      else setWebhookInfo(null);
    } catch {
      setWebhookInfo(null);
    }
  }, [settings?.bot_token, settings?.has_token]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsRes, statsRes, statusRes] = await Promise.allSettled([
        api.get<BotSettings>("/telegram-bot/settings/"),
        api.get<BotStats>("/telegram-bot/stats/"),
        api.get<{ is_active: boolean; is_running: boolean; use_webhook: boolean; pid: number | null }>(
          "/telegram-bot/settings/bot_status/"
        ),
      ]);

      if (settingsRes.status === "fulfilled") {
        setSettings(settingsRes.value.data);
      } else {
        throw settingsRes.reason;
      }

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      } else {
        setStats(null);
      }

      if (statusRes.status === "fulfilled") {
        syncSettingsWithStatus(statusRes.value.data);
      } else {
        setBotStatus(null);
      }
    } catch (err) {
      setError("Ma'lumotlarni yuklashda xato yuz berdi");
      toast({
        title: "Xato",
        description: "Ma'lumotlarni yuklashda xato yuz berdi",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [syncSettingsWithStatus, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!settings?.use_webhook) {
      setWebhookInfo(null);
      return;
    }
    void loadWebhookInfo();
  }, [loadWebhookInfo, settings?.use_webhook]);

  useEffect(() => {
    if (settings?.ai_provider && settings.ai_provider !== "disabled") {
      setPreferredAIProvider(settings.ai_provider as Exclude<AIProvider, "disabled">);
    }
  }, [settings?.ai_provider]);

  const startBot = useCallback(async (force = false) => {
    try {
      setStarting(true);
      const response = await api.post<{ success: boolean; error?: string; message?: string; pid?: number }>(
        "/telegram-bot/settings/start_bot/",
        force ? { force: true } : undefined
      );
      
      if (response.data.success) {
        setSettings(prev => prev ? { ...prev, is_active: true, use_webhook: false } : null);
        toast({
          title: "Muvaffaqiyat",
          description: "Bot muvaffaqiyatli ishga tushirildi"
        });
        // Statusni yangilash
        await loadStatus();
      } else {
        toast({
          title: "Xato",
          description: response.data.error,
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Xato",
        description: err?.response?.data?.error || "Botni ishga tushirishda xato",
        variant: "destructive"
      });
    } finally {
      setStarting(false);
    }
  }, [loadStatus, toast]);

  const switchToPolling = useCallback(async () => {
    try {
      setStarting(true);
      const response = await api.post<{ success: boolean; error?: string }>(
        "/telegram-bot/settings/start_bot/",
        { force: true }
      );
      if (response.data.success) {
        toast({
          title: "Muvaffaqiyat",
          description: "Webhook o'chirildi va polling ishga tushdi"
        });
        await loadStatus();
        setSettings(prev => prev ? { ...prev, is_active: true, use_webhook: false, webhook_url: '' } : null);
      } else {
        toast({
          title: "Xato",
          description: response.data.error || "Pollingga o'tishda xato",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Xato",
        description: err?.response?.data?.error || "Pollingga o'tishda xato",
        variant: "destructive"
      });
    } finally {
      setStarting(false);
    }
  }, [loadStatus, toast]);

  const stopBot = useCallback(async () => {
    try {
      setStopping(true);
      const response = await api.post<{ success: boolean; error?: string }>("/telegram-bot/settings/stop_bot/");
      
      if (response.data.success) {
        setSettings(prev => prev ? { ...prev, is_active: false, use_webhook: false } : null);
        toast({
          title: "Muvaffaqiyat",
          description: "Bot to'xtatildi"
        });
        await loadStatus();
      }
    } catch (err) {
      toast({
        title: "Xato",
        description: "Botni to'xtatishda xato",
        variant: "destructive"
      });
    } finally {
      setStopping(false);
    }
  }, [loadStatus, toast]);

  const saveSettings = useCallback(async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const payload: Partial<BotSettings> = { ...settings };
      delete payload.is_active;
      delete payload.use_webhook;
      if (!payload.bot_token) {
        delete payload.bot_token;
      }
      if (!payload.ai_api_key) {
        delete payload.ai_api_key;
      }
      await api.put("/telegram-bot/settings/1/", payload);
      toast({
        title: "Muvaffaqiyat",
        description: "Sozlamalar saqlandi"
      });
    } catch (err) {
      toast({
        title: "Xato",
        description: "Sozlamalarni saqlashda xato yuz berdi",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }, [settings, toast]);

  const testConnection = useCallback(async () => {
    try {
      setTesting(true);
      const response = await api.post<{ success: boolean; error?: string; bot_info?: { username: string } }>("/telegram-bot/settings/test_connection/");
      
      if (response.data.success && response.data.bot_info) {
        toast({
          title: "Ulanish muvaffaqiyatli",
          description: `Bot: @${response.data.bot_info.username}`
        });
        setSettings(prev => prev ? { ...prev, bot_username: response.data.bot_info!.username } : null);
      } else {
        toast({
          title: "Ulanish xatosi",
          description: response.data.error || "Noma'lum xato",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Xato",
        description: "Ulanishni tekshirishda xato yuz berdi",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  }, [toast]);

  const testAIConnection = useCallback(async () => {
    try {
      setTestingAI(true);
      const response = await api.post<{ success: boolean; error?: string; provider?: string; model?: string; message?: string }>("/telegram-bot/settings/test_ai_connection/");
      
      if (response.data.success) {
        toast({
          title: "AI muvaffaqiyatli ulandi!",
          description: `${response.data.provider} - ${response.data.model}`
        });
      } else {
        toast({
          title: "AI ulanish xatosi",
          description: response.data.error || "Noma'lum xato",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Xato",
        description: err?.response?.data?.error || "AI ulanishni tekshirishda xato yuz berdi",
        variant: "destructive"
      });
    } finally {
      setTestingAI(false);
    }
  }, [toast]);

  const setWebhook = useCallback(async () => {
    if (!settings?.webhook_url) {
      toast({
        title: "Xato",
        description: "Webhook URL kiriting",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await api.post<{ success: boolean; error?: string }>("/telegram-bot/settings/set_webhook/", {
        webhook_url: settings.webhook_url
      });
      
      if (response.data.success) {
        toast({
          title: "Muvaffaqiyat",
          description: "Webhook o'rnatildi"
        });
        setSettings(prev => prev ? { ...prev, is_active: true, use_webhook: true } : null);
        await loadStatus();
      } else {
        toast({
          title: "Xato",
          description: response.data.error || "Noma'lum xato",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Xato",
        description: "Webhook o'rnatishda xato yuz berdi",
        variant: "destructive"
      });
    }
  }, [loadStatus, settings?.webhook_url, toast]);

  const deleteWebhook = useCallback(async () => {
    try {
      const response = await api.post<{ success: boolean; error?: string }>("/telegram-bot/settings/delete_webhook/");
      
      if (response.data.success) {
        toast({
          title: "Muvaffaqiyat",
          description: "Webhook o'chirildi"
        });
        setSettings(prev => prev ? { ...prev, is_active: false, use_webhook: false, webhook_url: '' } : null);
        await loadStatus();
      }
    } catch (err) {
      toast({
        title: "Xato",
        description: "Webhook o'chirishda xato yuz berdi",
        variant: "destructive"
      });
    }
  }, [loadStatus, toast]);

  const aiEnabled = settings?.ai_provider !== "disabled";
  const aiReady = Boolean(aiEnabled && settings?.has_ai_key);

  const handleAIToggle = (checked: boolean) => {
    setSettings((prev) => {
      if (!prev) return null;

      if (!checked) {
        if (prev.ai_provider !== "disabled") {
          setPreferredAIProvider(prev.ai_provider as Exclude<AIProvider, "disabled">);
        }
        return { ...prev, ai_provider: "disabled" };
      }

      const nextProvider =
        prev.ai_provider !== "disabled"
          ? (prev.ai_provider as Exclude<AIProvider, "disabled">)
          : preferredAIProvider;

      return {
        ...prev,
        ai_provider: nextProvider,
        ai_model:
          prev.ai_provider === nextProvider && prev.ai_model
            ? prev.ai_model
            : getDefaultAIModel(nextProvider),
      };
    });
  };

  const handleAIProviderChange = (value: AIProvider) => {
    if (value !== "disabled") {
      setPreferredAIProvider(value);
    }

    setSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ai_provider: value,
        ai_model:
          value === "disabled"
            ? ""
            : prev.ai_provider === value && prev.ai_model
              ? prev.ai_model
              : getDefaultAIModel(value),
      };
    });
  };

  if (loading) {
    return (
      <AdminOnly title="Telegram Bot">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Yuklanmoqda...</p>
          </div>
        </div>
      </AdminOnly>
    );
  }

  if (error) {
    return (
      <AdminOnly title="Telegram Bot">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-secondary-foreground">{error}</p>
          <Button onClick={loadData} variant="outline" className="hover:bg-primary-soft">
            <RefreshCw className="h-4 w-4 mr-2" />
            Qayta urinish
          </Button>
        </div>
      </AdminOnly>
    );
  }

  return (
    <AdminOnly title="Telegram Bot">
      <div ref={pageRef} className="px-3 py-4 space-y-5 sm:px-4 lg:px-6 sm:space-y-6">
      {/* Header */}
      <section 
        data-gsap-section
        className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
      >
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            <Bot className="h-6 w-6 text-primary" />
            Telegram Bot
            {/* Bot holati ko'rsatkichi */}
            {settings?.use_webhook ? (
              <span className="flex items-center gap-1 text-sm font-normal text-primary">
                <Circle className="h-3 w-3 fill-blue-500 text-primary" />
                Webhook rejimi
              </span>
            ) : botStatus?.is_running ? (
              <span className="flex items-center gap-1 text-sm font-normal text-success">
                <Circle className="h-3 w-3 fill-emerald-500 text-success" />
                Ishlayapti
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
                <Circle className="h-3 w-3 fill-slate-400 text-muted-foreground" />
                To'xtatilgan
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            Bot sozlamalari va statistikasi
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
          {/* Yangilash tugmasi */}
          <Button variant="outline" onClick={loadData} disabled={loading} className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yangilash
          </Button>
          
          {/* Bot boshqaruv tugmalari */}
          {settings?.use_webhook ? (
            <>
              <Button 
                variant="outline"
                onClick={switchToPolling}
                disabled={starting || (!settings?.bot_token && !settings?.has_token)}
                className="w-full sm:w-auto"
              >
                <Play className="h-4 w-4 mr-2" />
                {starting ? "Pollingga o'tyapti..." : "Pollingga o'tish"}
              </Button>
              <Button 
                variant="destructive" 
                className="w-full bg-destructive text-white hover:bg-destructive sm:w-auto"
                onClick={stopBot} 
                disabled={stopping}
              >
                <Square className="h-4 w-4 mr-2" />
                {stopping ? "To'xtatilmoqda..." : "Webhookni to'xtatish"}
              </Button>
            </>
          ) : (
            <>
              {botStatus?.is_running ? (
                <Button 
                  variant="destructive" 
                  className="w-full bg-destructive text-white hover:bg-destructive sm:w-auto"
                  onClick={stopBot} 
                  disabled={stopping}
                >
                  <Square className="h-4 w-4 mr-2" />
                  {stopping ? "To'xtatilmoqda..." : "Botni to'xtatish"}
                </Button>
              ) : (
                <Button 
                  variant="default"
                  className="w-full bg-success text-white hover:bg-success sm:w-auto"
                  onClick={() => startBot(false)} 
                  disabled={starting || (!settings?.bot_token && !settings?.has_token)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {starting ? "Ishga tushirilmoqda..." : "Botni ishga tushirish"}
                </Button>
              )}
            </>
          )}
          <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </section>

      {/* Webhook rejimi haqida ogohlantirish */}
      {settings?.use_webhook && (
        <Card className="border-border bg-primary-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-primary">
              <strong>Webhook rejimi faol.</strong> Bot avtomatik ravishda Telegram serverlaridan 
              xabarlarni qabul qiladi. Polling rejimiga o'tish uchun avval webhook'ni o'chiring.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <section 
        data-gsap-section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Foydalanuvchilar</p>
                <p className="text-2xl font-bold text-foreground">{stats?.registered_users || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Jami murojaatlar</p>
                <p className="text-2xl font-bold text-foreground">{stats?.total_appeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Kutilmoqda</p>
                <p className="text-2xl font-bold text-foreground">{stats?.pending_appeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[var(--st-tekshiruvda-fg)]" />
              <div>
                <p className="text-sm text-muted-foreground">Bugun</p>
                <p className="text-2xl font-bold text-foreground">{stats?.today_appeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Topshiriq sifatida kiritilgan</p>
                <p className="text-2xl font-bold text-foreground">{stats?.forwarded_appeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Settings Tabs */}
      <section
        data-gsap-section
      >
        <Tabs defaultValue="connection" className="space-y-6">
        <div className="overflow-x-auto pb-1">
        <TabsList className="inline-flex min-w-max gap-2 rounded-xl bg-primary-soft p-1">
          <TabsTrigger value="connection" className="gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-md px-4 py-2.5 rounded-lg transition-all duration-200">
            <Link className="h-4 w-4" />
            Ulanish
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-md px-4 py-2.5 rounded-lg transition-all duration-200">
            <Brain className="h-4 w-4" />
            AI Sozlamalari
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-md px-4 py-2.5 rounded-lg transition-all duration-200">
            <MessageSquare className="h-4 w-4" />
            Xabarlar
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Connection Tab */}
        <TabsContent value="connection">
          <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5 text-primary" />
                Bot ulanish sozlamalari
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Telegram Bot API ulanish parametrlari va bot boshqaruvi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bot Status Switch */}
              <div className="flex items-center justify-between p-4 bg-primary-soft rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Bot holati</Label>
                  <p className="text-sm text-muted-foreground">
                    Botni yoqish yoki o'chirish (xabarlarni qabul qilish)
                  </p>
                </div>
                <Switch
                  checked={Boolean(settings?.use_webhook || botStatus?.is_running || settings?.is_active)}
                  disabled={starting || stopping || (!settings?.bot_token && !settings?.has_token)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      void startBot(false);
                    } else {
                      void stopBot();
                    }
                  }}
                />
              </div>

              {/* Bot Token */}
              <div className="space-y-3">
                <Label htmlFor="bot_token" className="text-base font-medium">Bot Token</Label>
                <p className="text-sm text-muted-foreground">
                  @BotFather dan olingan maxfiy token. Telegram'da /newbot buyrug'i orqali oling.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input 
                    id="bot_token"
                    type="password"
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={settings?.bot_token || ""}
                    autoComplete="new-password"
                    onChange={(e) => 
                      setSettings(prev => prev ? { 
                        ...prev, 
                        bot_token: e.target.value,
                        // Token o'zgarganda bot_username tozalansin
                        bot_username: ''
                      } : null)
                    }
                    className="flex-1 font-mono"
                  />
                    <Button 
                      variant="outline" 
                      onClick={testConnection}
                      disabled={testing || !settings?.bot_token}
                      className="w-full sm:min-w-[120px] sm:w-auto"
                    >
                    {testing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Tekshirilmoqda...
                      </>
                    ) : (
                      "Tekshirish"
                    )}
                  </Button>
                </div>
              </div>

              {/* Bot Status Info */}
              {settings?.bot_token && settings?.bot_username && botStatus?.is_running ? (
                <div className="p-4 bg-success-soft rounded-lg border border-border">
                  <p className="text-success flex items-center gap-2">
                    <span>✅</span>
                    <span className="font-medium">Bot ulangan va ishlayapti:</span>
                    <a 
                      href={`https://t.me/${settings.bot_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-success hover:underline"
                    >
                      @{settings.bot_username}
                    </a>
                  </p>
                </div>
              ) : settings?.has_token && !settings?.bot_token ? (
                <div className="p-4 bg-success-soft rounded-lg border border-border">
                  <p className="text-success flex items-center gap-2">
                    <span>✅</span>
                    <span className="font-medium">Token saqlangan.</span>
                    <span className="text-sm text-success">(Xavfsizlik uchun ko'rsatilmaydi)</span>
                  </p>
                </div>
              ) : (settings?.bot_token || settings?.has_token) && settings?.bot_username ? (
                <div className="p-4 bg-warning-soft rounded-lg border border-border">
                  <p className="text-warning flex items-center gap-2">
                    <span>⚠️</span>
                    <span className="font-medium">Bot to'xtatilgan:</span>
                    <span>@{settings.bot_username}</span>
                    <span className="text-sm text-warning">(Ishga tushirish tugmasini bosing)</span>
                  </p>
                </div>
              ) : settings?.bot_token || settings?.has_token ? (
                <div className="p-4 bg-warning-soft rounded-lg border border-border">
                  <p className="text-warning flex items-center gap-2">
                    <span>⚠️</span>
                    <span className="font-medium">Token kiritilgan, lekin tekshirilmagan.</span>
                    <span className="text-sm">"Tekshirish" tugmasini bosing.</span>
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-primary-soft rounded-lg border border-border">
                  <p className="text-muted-foreground flex items-center gap-2">
                    <span>ℹ️</span>
                    <span>Bot ulanmagan. @BotFather dan token oling va yuqoriga kiriting.</span>
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-border pt-4">
                <h4 className="font-medium text-foreground mb-4">Xabar qabul qilish usuli</h4>
              </div>

              {/* Webhook Settings */}
              <div className="space-y-3">
                <Label htmlFor="webhook_url" className="text-base font-medium">Webhook URL</Label>
                <p className="text-sm text-muted-foreground">
                  Production uchun webhook tavsiya etiladi. Lokal ishlab chiqish uchun polling ishlatiladi.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input 
                    id="webhook_url"
                    placeholder="https://your-domain.com/api/telegram-bot/webhook/"
                    value={settings?.webhook_url || ""}
                    onChange={(e) => 
                      setSettings(prev => prev ? { ...prev, webhook_url: e.target.value } : null)
                    }
                    className="flex-1 min-w-0"
                    disabled={settings?.use_webhook}
                  />
                  {settings?.use_webhook ? (
                    <Button variant="destructive" onClick={deleteWebhook} className="w-full sm:min-w-[120px] sm:w-auto">
                      <Unlink className="h-4 w-4 mr-2" />
                      O'chirish
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={setWebhook}
                      disabled={!settings?.webhook_url}
                      className="w-full sm:min-w-[120px] sm:w-auto"
                    >
                      <Link className="h-4 w-4 mr-2" />
                      O'rnatish
                    </Button>
                  )}
                </div>
                
                {/* Webhook/Polling status */}
                <div className={`p-3 rounded-lg ${
                  settings?.use_webhook 
                    ? 'bg-primary-soft text-primary border border-border' 
                    : 'bg-warning-soft text-warning border border-border'
                }`}>
                  {settings?.use_webhook ? (
                    <p className="text-sm flex items-center gap-2">
                      <span>🌐</span>
                      <strong>Webhook rejimi faol.</strong> Telegram serverlaridan xabarlar avtomatik qabul qilinadi.
                    </p>
                  ) : (
                    <p className="text-sm flex items-center gap-2">
                      <span>🔄</span>
                      <strong>Polling rejimi.</strong> Bot serverda ishga tushirilishi kerak.
                    </p>
                  )}
                </div>
                {settings?.use_webhook && webhookInfo && (
                  <div className="rounded-lg border border-border bg-background p-3 text-sm text-secondary-foreground">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-medium">Webhook holati</span>
                      <Button size="sm" variant="ghost" onClick={loadWebhookInfo}>
                        Yangilash
                      </Button>
                    </div>
                    <div className="mt-2 grid gap-1 break-words">
                      <div>URL: {webhookInfo.url || "-"}</div>
                      <div>Pending: {webhookInfo.pending_update_count ?? 0}</div>
                      {webhookInfo.last_error_message && (
                        <div className="text-warning">Xato: {webhookInfo.last_error_message}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Help box */}
              <div className="p-4 bg-primary-soft rounded-lg">
                <h5 className="font-medium text-foreground mb-2">💡 Qaysi usulni tanlash kerak?</h5>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>Webhook:</strong> Production server uchun (HTTPS talab qilinadi). Tez va samarali.</p>
                  <p><strong>Polling:</strong> Lokal ishlab chiqish yoki HTTPS bo'lmagan serverlar uchun. "Botni ishga tushirish" tugmasini bosing.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai">
          <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[var(--st-tekshiruvda-fg)]" />
                AI tahlil sozlamalari
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                AI Yordamchi va Telegram Bot uchun sun'iy intellekt sozlamalari
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-[var(--st-tekshiruvda-bg)] rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-foreground">
                      <Brain className="h-5 w-5 text-[var(--st-tekshiruvda-fg)]" />
                      <h3 className="text-lg font-semibold">AI yordamchini boshqarish</h3>
                    </div>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      Telegram bot murojaatlarni tahlil qilishi, tasniflashi va kerak bo&apos;lsa AI yordamchi orqali javob tayyorlashi uchun bu bo&apos;limdan foydalaniladi.
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 lg:min-w-[280px]">
                    <div>
                      <p className="text-sm font-medium text-foreground">AI holati</p>
                      <p className="text-xs text-muted-foreground">
                        {aiEnabled ? "AI yordamchi faol ishlaydi" : "Hozircha qo'lda ko'rib chiqish rejimi"}
                      </p>
                    </div>
                    <Switch checked={aiEnabled} onCheckedChange={handleAIToggle} />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className={`rounded-xl border p-4 ${aiEnabled ? "border-border bg-success-soft" : "border-border bg-background"}`}>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Holat</p>
                    <p className={`mt-2 text-base font-semibold ${aiEnabled ? "text-success" : "text-secondary-foreground"}`}>
                      {aiEnabled ? "Yoqilgan" : "O'chirilgan"}
                    </p>
                  </div>
                  <div className={`rounded-xl border p-4 ${aiReady ? "border-border bg-success-soft" : "border-border bg-warning-soft"}`}>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Ulanish</p>
                    <p className={`mt-2 text-base font-semibold ${aiReady ? "text-success" : "text-warning"}`}>
                      {aiReady ? "API kalit saqlangan" : "Kalit kiritilmagan"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Model</p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {aiEnabled ? settings?.ai_model || "-" : "Tanlanmagan"}
                    </p>
                  </div>
                </div>
              </div>

              {aiEnabled ? (
                <>
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
                    <div className="space-y-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
                      <div className="space-y-3">
                        <Label className="text-base font-medium">AI Provayder</Label>
                        <p className="text-sm text-muted-foreground">
                          AI xizmatini taqdim etuvchi kompaniyani tanlang.
                        </p>
                        <Select
                          value={settings?.ai_provider || "disabled"}
                          onValueChange={(value) => handleAIProviderChange(value as AIProvider)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Provayderni tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI (GPT modellari)</SelectItem>
                            <SelectItem value="anthropic">Anthropic (Claude modellari)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="ai_api_key" className="text-base font-medium">
                            API kalit
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {settings?.ai_provider === "openai"
                              ? "OpenAI platformasidan olingan API kalitni kiriting."
                              : "Anthropic Console'dan olingan API kalitni kiriting."}
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              id="ai_api_key"
                              type="password"
                              placeholder={settings?.ai_provider === "openai" ? "sk-..." : "sk-ant-api03-..."}
                              value={settings?.ai_api_key || ""}
                              onChange={(e) =>
                                setSettings((prev) => (prev ? { ...prev, ai_api_key: e.target.value } : null))
                              }
                              className="flex-1 font-mono"
                            />
                            <Button
                              variant="outline"
                              onClick={testAIConnection}
                              disabled={testingAI || (!settings?.ai_api_key && !settings?.has_ai_key)}
                              className="w-full sm:min-w-[140px] sm:w-auto"
                            >
                              {testingAI ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Tekshirilmoqda...
                                </>
                              ) : (
                                "Tekshirish"
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {settings?.has_ai_key && !settings?.ai_api_key
                              ? "API kalit serverda saqlangan. Yangisini kiritmasangiz eski kalit saqlanib qoladi."
                              : "API kalitni tekshirib, keyin umumiy Saqlash tugmasini bosing."}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base font-medium">AI model</Label>
                          <p className="text-sm text-muted-foreground">
                            Telegram bot uchun ishlatiladigan modelni tanlang.
                          </p>
                          <Select
                            value={settings?.ai_model || getDefaultAIModel((settings?.ai_provider || "openai") as AIProvider)}
                            onValueChange={(value) =>
                              setSettings((prev) => (prev ? { ...prev, ai_model: value } : null))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Modelni tanlang" />
                            </SelectTrigger>
                            <SelectContent>
                              {settings?.ai_provider === "openai" ? (
                                <>
                                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                                  <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                                  <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                                  <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 rounded-2xl border border-border bg-background p-5 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white p-4">
                          <div>
                            <Label className="text-base font-medium">AI avtomatik javobi</Label>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Admin javob bermasa bot AI orqali dastlabki javob yuboradi.
                            </p>
                          </div>
                          <Switch
                            checked={settings?.auto_response_enabled}
                            onCheckedChange={(checked) =>
                              setSettings((prev) =>
                                prev ? { ...prev, auto_response_enabled: checked } : null
                              )
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="ai_timeout" className="text-sm font-medium">
                            Kutish vaqti
                          </Label>
                          <Input
                            id="ai_timeout"
                            type="number"
                            min={1}
                            max={1440}
                            value={settings?.auto_response_timeout_minutes ?? 5}
                            onChange={(e) =>
                              setSettings((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      auto_response_timeout_minutes: Math.max(
                                        1,
                                        Number.parseInt(e.target.value || "1", 10)
                                      ),
                                    }
                                  : null
                              )
                            }
                            disabled={!settings?.auto_response_enabled}
                          />
                          <p className="text-xs text-muted-foreground">
                            Shu vaqt ichida admin javob bermasa AI avtomatik javob beradi.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-primary-soft p-4">
                        <h5 className="font-medium text-primary">AI tahlil nimalarni qiladi?</h5>
                        <ul className="mt-2 space-y-1 text-sm text-primary">
                          <li>• Murojaat matnini avtomatik tahlil qiladi</li>
                          <li>• Kategoriya va ustuvorlikni aniqlashga yordam beradi</li>
                          <li>• Tegishli tashkilotni topishni tezlashtiradi</li>
                          <li>• Admin javobini kutish jarayonini qisqartiradi</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border-strong bg-background px-5 py-8 text-center">
                  <p className="text-base font-medium text-secondary-foreground">
                    AI yordamchi hozir o&apos;chirilgan
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Yuqoridagi switch orqali AI ni yoqing. Avvalgi provayder tanlovi saqlanadi, keyin API kalit va modelni sozlashingiz mumkin.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-success" />
                Xabar shablonlari
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Foydalanuvchilarga yuboriladigan xabarlarni sozlash
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* O'zbekcha */}
              <div className="space-y-3">
                <Label htmlFor="welcome_uz" className="text-base font-medium flex items-center gap-2">
                  🇺🇿 Xush kelibsiz xabari (O'zbekcha)
                </Label>
                <Textarea 
                  id="welcome_uz"
                  rows={5}
                  placeholder="Assalomu alaykum! Hatirchi tuman hokimligining rasmiy botiga xush kelibsiz..."
                  value={settings?.welcome_message_uz || ""}
                  onChange={(e) => 
                    setSettings(prev => prev ? { ...prev, welcome_message_uz: e.target.value } : null)
                  }
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Foydalanuvchi birinchi marta /start bosganida ko'rsatiladi
                </p>
              </div>

              {/* Ruscha */}
              <div className="space-y-3">
                <Label htmlFor="welcome_ru" className="text-base font-medium flex items-center gap-2">
                  🇷🇺 Xush kelibsiz xabari (Ruscha)
                </Label>
                <Textarea 
                  id="welcome_ru"
                  rows={5}
                  placeholder="Добро пожаловать! Это официальный бот хокимията Хатырчинского района..."
                  value={settings?.welcome_message_ru || ""}
                  onChange={(e) => 
                    setSettings(prev => prev ? { ...prev, welcome_message_ru: e.target.value } : null)
                  }
                  className="resize-none"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="about_uz" className="text-base font-medium flex items-center gap-2">
                    ℹ️ Biz haqimizda (O'zbekcha)
                  </Label>
                  <Textarea
                    id="about_uz"
                    rows={6}
                    placeholder="Hatirchi tumani hokimiyati haqida ma'lumot..."
                    value={settings?.about_text_uz || ""}
                    onChange={(e) =>
                      setSettings(prev => prev ? { ...prev, about_text_uz: e.target.value } : null)
                    }
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Foydalanuvchi botdagi ℹ️ Biz haqimizda tugmasini bosganda ko'rsatiladi
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="help_uz" className="text-base font-medium flex items-center gap-2">
                    ❓ Yordam (O'zbekcha)
                  </Label>
                  <Textarea
                    id="help_uz"
                    rows={6}
                    placeholder="Bot imkoniyatlari va aloqa ma'lumotlari..."
                    value={settings?.help_text_uz || ""}
                    onChange={(e) =>
                      setSettings(prev => prev ? { ...prev, help_text_uz: e.target.value } : null)
                    }
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Foydalanuvchi ❓ Yordam tugmasini bosganda ko'rsatiladi
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="about_ru" className="text-base font-medium flex items-center gap-2">
                    ℹ️ Biz haqimizda (Ruscha)
                  </Label>
                  <Textarea
                    id="about_ru"
                    rows={6}
                    placeholder="Информация о хокимияте Хатырчинского района..."
                    value={settings?.about_text_ru || ""}
                    onChange={(e) =>
                      setSettings(prev => prev ? { ...prev, about_text_ru: e.target.value } : null)
                    }
                    className="resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="help_ru" className="text-base font-medium flex items-center gap-2">
                    ❓ Yordam (Ruscha)
                  </Label>
                  <Textarea
                    id="help_ru"
                    rows={6}
                    placeholder="Возможности бота и контакты для связи..."
                    value={settings?.help_text_ru || ""}
                    onChange={(e) =>
                      setSettings(prev => prev ? { ...prev, help_text_ru: e.target.value } : null)
                    }
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="about_en" className="text-base font-medium flex items-center gap-2">
                    ℹ️ Biz haqimizda (English)
                  </Label>
                  <Textarea
                    id="about_en"
                    rows={6}
                    placeholder="Information about Hatirchi District Administration..."
                    value={settings?.about_text_en || ""}
                    onChange={(e) =>
                      setSettings(prev => prev ? { ...prev, about_text_en: e.target.value } : null)
                    }
                    className="resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="help_en" className="text-base font-medium flex items-center gap-2">
                    ❓ Yordam (English)
                  </Label>
                  <Textarea
                    id="help_en"
                    rows={6}
                    placeholder="Bot capabilities and contact details..."
                    value={settings?.help_text_en || ""}
                    onChange={(e) =>
                      setSettings(prev => prev ? { ...prev, help_text_en: e.target.value } : null)
                    }
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="p-4 bg-warning-soft rounded-lg border border-border">
                <h5 className="font-medium text-warning mb-2">💡 Qo'llaniladigan o'zgaruvchilar</h5>
                <div className="text-sm text-warning space-y-1">
                  <p><code className="bg-warning-soft px-1 rounded">{'{name}'}</code> - Foydalanuvchi ismi</p>
                  <p><code className="bg-warning-soft px-1 rounded">{'{bot_name}'}</code> - Bot nomi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </section>

      {/* Quick Links */}
      <section
        data-gsap-section
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card 
          className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => router.push("/dashboard/telegram-bot/users")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-foreground">Foydalanuvchilar</p>
                <p className="text-sm text-muted-foreground">
                  {stats?.registered_users || 0} ta ro'yxatdan o'tgan
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => router.push("/dashboard/appeals")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-foreground">Murojaatlar</p>
                <p className="text-sm text-muted-foreground">
                  {stats?.pending_appeals || 0} ta kutilmoqda
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => router.push("/dashboard/telegram-bot/regions")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-warning" />
              <div>
                <p className="font-medium text-foreground">Hududlar</p>
                <p className="text-sm text-muted-foreground">
                  Mahalla va qishloqlar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      </div>
    </AdminOnly>
  );
}
