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
import { Header } from "@/components/layout/header";
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
  has_token: boolean;
  has_ai_key: boolean;
  welcome_message_uz: string;
  welcome_message_ru: string;
  welcome_message_en: string;
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
  const [botStatus, setBotStatus] = useState<{
    is_active: boolean;
    is_running: boolean;
    use_webhook: boolean;
    pid: number | null;
  } | null>(null);

  const loadData = useCallback(async () => {
  const loadStatus = useCallback(async () => {
    const statusRes = await api.get<{ is_active: boolean; is_running: boolean; use_webhook: boolean; pid: number | null }>(
      "/telegram-bot/settings/bot_status/"
    );
    setBotStatus(statusRes.data);
  }, []);

  const loadWebhookInfo = useCallback(async () => {
    if (!settings?.bot_token && !settings?.has_token) return;
    try {
      const response = await api.get<{ success: boolean; result?: WebhookInfo }>("/telegram-bot/settings/webhook_info/");
      if (response.data.success && response.data.result) {
        setWebhookInfo(response.data.result);
      }
    } catch {
      setWebhookInfo(null);
    }
  }, [settings?.bot_token, settings?.has_token]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsRes, statsRes, statusRes] = await Promise.all([
        api.get<BotSettings>("/telegram-bot/settings/"),
        api.get<BotStats>("/telegram-bot/stats/"),
        api.get<{ is_active: boolean; is_running: boolean; use_webhook: boolean; pid: number | null }>("/telegram-bot/settings/bot_status/")
      ]);
      setSettings(settingsRes.data);
      setStats(statsRes.data);
      setBotStatus(statusRes.data);
      if (settingsRes.data?.use_webhook) {
        try {
          const webhookRes = await api.get<{ success: boolean; result?: WebhookInfo }>("/telegram-bot/settings/webhook_info/");
          if (webhookRes.data.success && webhookRes.data.result) {
            setWebhookInfo(webhookRes.data.result);
          }
        } catch {
          setWebhookInfo(null);
        }
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
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startBot = useCallback(async (force = false) => {
    try {
      setStarting(true);
      const response = await api.post<{ success: boolean; error?: string; message?: string; pid?: number }>(
        "/telegram-bot/settings/start_bot/",
        force ? { force: true } : undefined
      );
      
      if (response.data.success) {
        toast({
          title: "Muvaffaqiyat",
          description: "Bot muvaffaqiyatli ishga tushirildi"
        });
        // Statusni yangilash
        const statusRes = await api.get<{ is_active: boolean; is_running: boolean; use_webhook: boolean; pid: number | null }>("/telegram-bot/settings/bot_status/");
        setBotStatus(statusRes.data);
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
  }, [toast]);

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
        const statusRes = await api.get<{ is_active: boolean; is_running: boolean; use_webhook: boolean; pid: number | null }>("/telegram-bot/settings/bot_status/");
        setBotStatus(statusRes.data);
        setSettings(prev => prev ? { ...prev, use_webhook: false, webhook_url: '' } : null);
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
  }, [toast]);

  const stopBot = useCallback(async () => {
    try {
      setStopping(true);
      const response = await api.post<{ success: boolean; error?: string }>("/telegram-bot/settings/stop_bot/");
      
      if (response.data.success) {
        toast({
          title: "Muvaffaqiyat",
          description: "Bot to'xtatildi"
        });
        // Statusni yangilash
        const statusRes = await api.get<{ is_active: boolean; is_running: boolean; use_webhook: boolean; pid: number | null }>("/telegram-bot/settings/bot_status/");
        setBotStatus(statusRes.data);
        setSettings(prev => prev ? { ...prev, use_webhook: statusRes.data.use_webhook, is_active: statusRes.data.is_active } : null);
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
  }, [toast]);

  const saveSettings = useCallback(async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const payload: Partial<BotSettings> = { ...settings };
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
  }, [loadStatus, toast]);

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
        setSettings(prev => prev ? { ...prev, use_webhook: true } : null);
        const statusRes = await api.get<{ is_active: boolean; is_running: boolean; use_webhook: boolean; pid: number | null }>("/telegram-bot/settings/bot_status/");
        setBotStatus(statusRes.data);
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
  }, [settings?.webhook_url, toast]);
  }, [loadStatus, settings?.webhook_url, toast]);
  }, [loadStatus, toast]);

  const deleteWebhook = useCallback(async () => {
    try {
      const response = await api.post<{ success: boolean; error?: string }>("/telegram-bot/settings/delete_webhook/");
      
      if (response.data.success) {
        toast({
          title: "Muvaffaqiyat",
          description: "Webhook o'chirildi"
        });
        setSettings(prev => prev ? { ...prev, use_webhook: false, webhook_url: '' } : null);
        const statusRes = await api.get<{ is_active: boolean; is_running: boolean; use_webhook: boolean; pid: number | null }>("/telegram-bot/settings/bot_status/");
        setBotStatus(statusRes.data);
      }
    } catch (err) {
      toast({
        title: "Xato",
        description: "Webhook o'chirishda xato yuz berdi",
        variant: "destructive"
      });
    }
  }, [toast]);

  if (loading) {
    return (
      <AdminOnly title="Telegram Bot">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-500">Yuklanmoqda...</p>
          </div>
        </div>
      </AdminOnly>
    );
  }

  if (error) {
    return (
      <AdminOnly title="Telegram Bot">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-red-600" />
          <p className="text-slate-700">{error}</p>
          <Button onClick={loadData} variant="outline" className="hover:bg-blue-50">
            <RefreshCw className="h-4 w-4 mr-2" />
            Qayta urinish
          </Button>
        </div>
      </AdminOnly>
    );
  }

  return (
    <AdminOnly title="Telegram Bot">
      <div ref={pageRef} className="p-6 space-y-6">
      {/* Header */}
      <section 
        data-gsap-section
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-500" />
            Telegram Bot
            {/* Bot holati ko'rsatkichi */}
            {settings?.use_webhook ? (
              <span className="flex items-center gap-1 text-sm font-normal text-blue-600">
                <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />
                Webhook rejimi
              </span>
            ) : botStatus?.is_running ? (
              <span className="flex items-center gap-1 text-sm font-normal text-emerald-600">
                <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                Ishlayapti
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm font-normal text-slate-500">
                <Circle className="h-3 w-3 fill-slate-400 text-slate-400" />
                To'xtatilgan
              </span>
            )}
          </h1>
          <p className="text-slate-500">
            Bot sozlamalari va statistikasi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Yangilash tugmasi */}
          <Button variant="outline" onClick={loadData} disabled={loading}>
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
              >
                <Play className="h-4 w-4 mr-2" />
                {starting ? "Pollingga o'tyapti..." : "Pollingga o'tish"}
              </Button>
              <Button 
                variant="destructive" 
                className="bg-red-600 hover:bg-red-700 text-white"
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
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={stopBot} 
                  disabled={stopping}
                >
                  <Square className="h-4 w-4 mr-2" />
                  {stopping ? "To'xtatilmoqda..." : "Botni to'xtatish"}
                </Button>
              ) : (
                <Button 
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => startBot(false)} 
                  disabled={starting || (!settings?.bot_token && !settings?.has_token)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {starting ? "Ishga tushirilmoqda..." : "Botni ishga tushirish"}
                </Button>
              )}
            </>
          )}
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </section>

      {/* Webhook rejimi haqida ogohlantirish */}
      {settings?.use_webhook && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-700">
              <strong>Webhook rejimi faol.</strong> Bot avtomatik ravishda Telegram serverlaridan 
              xabarlarni qabul qiladi. Polling rejimiga o'tish uchun avval webhook'ni o'chiring.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <section 
        data-gsap-section
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-slate-500">Foydalanuvchilar</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.registered_users || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-slate-500">Jami murojaatlar</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.total_appeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-slate-500">Kutilmoqda</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.pending_appeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-slate-500">Bugun</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.today_appeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-slate-500">Topshiriq sifatida kiritilgan</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.forwarded_appeals || 0}</p>
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
        <TabsList className="gap-2 p-1 bg-indigo-50/50 rounded-xl">
          <TabsTrigger value="connection" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md px-4 py-2.5 rounded-lg transition-all duration-200">
            <Link className="h-4 w-4" />
            Ulanish
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md px-4 py-2.5 rounded-lg transition-all duration-200">
            <Brain className="h-4 w-4" />
            AI Sozlamalari
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md px-4 py-2.5 rounded-lg transition-all duration-200">
            <MessageSquare className="h-4 w-4" />
            Xabarlar
          </TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connection">
          <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5 text-blue-500" />
                Bot ulanish sozlamalari
              </CardTitle>
              <CardDescription className="text-slate-500">
                Telegram Bot API ulanish parametrlari va bot boshqaruvi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bot Status Switch */}
              <div className="flex items-center justify-between p-4 bg-indigo-50/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Bot holati</Label>
                  <p className="text-sm text-slate-500">
                    Botni yoqish yoki o'chirish (xabarlarni qabul qilish)
                  </p>
                </div>
                <Switch 
                  checked={settings?.is_active}
                  onCheckedChange={(checked) => 
                    setSettings(prev => prev ? { ...prev, is_active: checked } : null)
                  }
                />
              </div>

              {/* Bot Token */}
              <div className="space-y-3">
                <Label htmlFor="bot_token" className="text-base font-medium">Bot Token</Label>
                <p className="text-sm text-slate-500">
                  @BotFather dan olingan maxfiy token. Telegram'da /newbot buyrug'i orqali oling.
                </p>
                <div className="flex gap-2">
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
                    className="min-w-[120px]"
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
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-emerald-700 flex items-center gap-2">
                    <span>✅</span>
                    <span className="font-medium">Bot ulangan va ishlayapti:</span>
                    <a 
                      href={`https://t.me/${settings.bot_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline"
                    >
                      @{settings.bot_username}
                    </a>
                  </p>
                </div>
              ) : settings?.has_token && !settings?.bot_token ? (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-emerald-700 flex items-center gap-2">
                    <span>✅</span>
                    <span className="font-medium">Token saqlangan.</span>
                    <span className="text-sm text-emerald-600">(Xavfsizlik uchun ko'rsatilmaydi)</span>
                  </p>
                </div>
              ) : (settings?.bot_token || settings?.has_token) && settings?.bot_username ? (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-700 flex items-center gap-2">
                    <span>⚠️</span>
                    <span className="font-medium">Bot to'xtatilgan:</span>
                    <span>@{settings.bot_username}</span>
                    <span className="text-sm text-amber-600">(Ishga tushirish tugmasini bosing)</span>
                  </p>
                </div>
              ) : settings?.bot_token || settings?.has_token ? (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-700 flex items-center gap-2">
                    <span>⚠️</span>
                    <span className="font-medium">Token kiritilgan, lekin tekshirilmagan.</span>
                    <span className="text-sm">"Tekshirish" tugmasini bosing.</span>
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100/40">
                  <p className="text-slate-500 flex items-center gap-2">
                    <span>ℹ️</span>
                    <span>Bot ulanmagan. @BotFather dan token oling va yuqoriga kiriting.</span>
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-indigo-100/40 pt-4">
                <h4 className="font-medium text-slate-900 mb-4">Xabar qabul qilish usuli</h4>
              </div>

              {/* Webhook Settings */}
              <div className="space-y-3">
                <Label htmlFor="webhook_url" className="text-base font-medium">Webhook URL</Label>
                <p className="text-sm text-slate-500">
                  Production uchun webhook tavsiya etiladi. Lokal ishlab chiqish uchun polling ishlatiladi.
                </p>
                <div className="flex gap-2">
                  <Input 
                    id="webhook_url"
                    placeholder="https://your-domain.com/api/telegram-bot/webhook/"
                    value={settings?.webhook_url || ""}
                    onChange={(e) => 
                      setSettings(prev => prev ? { ...prev, webhook_url: e.target.value } : null)
                    }
                    className="flex-1"
                    disabled={settings?.use_webhook}
                  />
                  {settings?.use_webhook ? (
                    <Button variant="destructive" onClick={deleteWebhook} className="min-w-[120px]">
                      <Unlink className="h-4 w-4 mr-2" />
                      O'chirish
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={setWebhook}
                      disabled={!settings?.webhook_url}
                      className="min-w-[120px]"
                    >
                      <Link className="h-4 w-4 mr-2" />
                      O'rnatish
                    </Button>
                  )}
                </div>
                
                {/* Webhook/Polling status */}
                <div className={`p-3 rounded-lg ${
                  settings?.use_webhook 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
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
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Webhook holati</span>
                      <Button size="sm" variant="ghost" onClick={loadWebhookInfo}>
                        Yangilash
                      </Button>
                    </div>
                    <div className="mt-2 grid gap-1">
                      <div>URL: {webhookInfo.url || "-"}</div>
                      <div>Pending: {webhookInfo.pending_update_count ?? 0}</div>
                      {webhookInfo.last_error_message && (
                        <div className="text-amber-700">Xato: {webhookInfo.last_error_message}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Help box */}
              <div className="p-4 bg-indigo-50/50 rounded-lg">
                <h5 className="font-medium text-slate-900 mb-2">💡 Qaysi usulni tanlash kerak?</h5>
                <div className="text-sm text-slate-500 space-y-2">
                  <p><strong>Webhook:</strong> Production server uchun (HTTPS talab qilinadi). Tez va samarali.</p>
                  <p><strong>Polling:</strong> Lokal ishlab chiqish yoki HTTPS bo'lmagan serverlar uchun. "Botni ishga tushirish" tugmasini bosing.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai">
          <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                AI tahlil sozlamalari
              </CardTitle>
              <CardDescription className="text-slate-500">
                AI Yordamchi va Telegram Bot uchun sun'iy intellekt sozlamalari
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Status Alert */}
              {settings?.ai_provider === 'disabled' || !settings?.has_ai_key ? (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-700 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>
                      <strong>AI sozlanmagan.</strong> AI Yordamchi va Telegram bot AI tahlili uchun 
                      quyida provayder tanlab API kalitni kiriting.
                    </span>
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-emerald-700 flex items-center gap-2">
                    <span>✅</span>
                    <span>
                      <strong>AI faol.</strong> AI Yordamchi ({settings.ai_provider === 'openai' ? 'OpenAI' : 'Anthropic'} - {settings.ai_model}) 
                      va Telegram bot AI tahlili ishlaydi.
                    </span>
                  </p>
                </div>
              )}

              {/* AI Provider Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">AI Provayder</Label>
                <p className="text-sm text-slate-500">
                  AI xizmatini taqdim etuvchi kompaniyani tanlang
                </p>
                <Select 
                  value={settings?.ai_provider || 'disabled'}
                  onValueChange={(value) => 
                    setSettings(prev => prev ? { 
                      ...prev, 
                      ai_provider: value,
                      // Provider o'zgarganda default modelni o'rnatish
                      ai_model: value === 'openai' ? 'gpt-4o-mini' : 
                               value === 'anthropic' ? 'claude-3-haiku-20240307' : ''
                    } : null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Provayderni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">⏸️</span>
                        <span>O'chirilgan</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="openai">
                      <div className="flex items-center gap-2">
                        <span>🤖</span>
                        <span>OpenAI (GPT modellari)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="anthropic">
                      <div className="flex items-center gap-2">
                        <span>🧠</span>
                        <span>Anthropic (Claude modellari)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Provider status */}
                <div className={`p-3 rounded-lg ${
                  settings?.ai_provider === 'disabled' 
                    ? 'bg-indigo-50/50 text-slate-500' 
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {settings?.ai_provider === 'disabled' ? (
                    <p className="text-sm flex items-center gap-2">
                      <span>ℹ️</span>
                      AI tahlil o'chirilgan. Murojaatlar qo'lda ko'rib chiqiladi.
                    </p>
                  ) : (
                    <p className="text-sm flex items-center gap-2">
                      <span>✅</span>
                      Murojaatlar avtomatik tahlil qilinadi va kategoriyalanadi.
                    </p>
                  )}
                </div>
              </div>

              {settings?.ai_provider && settings.ai_provider !== 'disabled' && (
                <>
                  {/* Divider */}
                  <div className="border-t border-indigo-100/40 pt-4">
                    <h4 className="font-medium text-slate-900 mb-4">API sozlamalari</h4>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <Label htmlFor="ai_api_key" className="text-base font-medium">
                      API Kalit
                    </Label>
                    <p className="text-sm text-slate-500">
                      {settings.ai_provider === 'openai' 
                        ? "OpenAI platformasidan olingan API kalit (platform.openai.com)"
                        : "Anthropic Console'dan olingan API kalit (console.anthropic.com)"
                      }
                    </p>
                    <div className="flex gap-2">
                      <Input 
                        id="ai_api_key"
                        type="password"
                        placeholder={settings.ai_provider === 'openai' ? "sk-..." : "sk-ant-api03-..."}
                        value={settings?.ai_api_key || ""}
                        onChange={(e) => 
                          setSettings(prev => prev ? { ...prev, ai_api_key: e.target.value } : null)
                        }
                        className="font-mono flex-1"
                      />
                      <Button 
                        variant="outline" 
                        onClick={testAIConnection}
                        disabled={testingAI || !settings?.ai_api_key}
                        className="min-w-[120px]"
                      >
                        {testingAI ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Tekshirilmoqda...
                          </>
                        ) : (
                          "Tekshirish"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      💡 API kalitni kiritib "Tekshirish" tugmasini bosing. Muvaffaqiyatli bo'lsa, "Saqlash" tugmasini bosing.
                    </p>
                  </div>

                  {/* AI Model Selection */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium">AI Model</Label>
                    <p className="text-sm text-slate-500">
                      Ishlatilayotgan aniq AI modelini tanlang
                    </p>
                    <Select 
                      value={settings?.ai_model || 'gpt-4o-mini'}
                      onValueChange={(value) => 
                        setSettings(prev => prev ? { ...prev, ai_model: value } : null)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Modelni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.ai_provider === 'openai' ? (
                          <>
                            <SelectItem value="gpt-4o-mini">
                              <div className="flex flex-col">
                                <span className="font-medium">GPT-4o Mini</span>
                                <span className="text-xs text-slate-500">Tez va arzon - kundalik ishlar uchun ideal</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="gpt-4o">
                              <div className="flex flex-col">
                                <span className="font-medium">GPT-4o</span>
                                <span className="text-xs text-slate-500">Eng kuchli - murakkab tahlillar uchun</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="gpt-4-turbo">
                              <div className="flex flex-col">
                                <span className="font-medium">GPT-4 Turbo</span>
                                <span className="text-xs text-slate-500">Tez va kuchli</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="gpt-3.5-turbo">
                              <div className="flex flex-col">
                                <span className="font-medium">GPT-3.5 Turbo</span>
                                <span className="text-xs text-slate-500">Eng arzon - oddiy vazifalar uchun</span>
                              </div>
                            </SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="claude-3-haiku-20240307">
                              <div className="flex flex-col">
                                <span className="font-medium">Claude 3 Haiku</span>
                                <span className="text-xs text-slate-500">Tez va arzon - kundalik ishlar uchun</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="claude-3-sonnet-20240229">
                              <div className="flex flex-col">
                                <span className="font-medium">Claude 3 Sonnet</span>
                                <span className="text-xs text-slate-500">Muvozanat - tezlik va sifat</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="claude-3-opus-20240229">
                              <div className="flex flex-col">
                                <span className="font-medium">Claude 3 Opus</span>
                                <span className="text-xs text-slate-500">Eng kuchli - murakkab tahlillar uchun</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="claude-3-5-sonnet-20241022">
                              <div className="flex flex-col">
                                <span className="font-medium">Claude 3.5 Sonnet</span>
                                <span className="text-xs text-slate-500">Yangi avlod - yuqori sifat</span>
                              </div>
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Info box */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-900 mb-2">💡 AI tahlil qanday ishlaydi?</h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Foydalanuvchi murojaatini avtomatik kategoriyalaydi</li>
                      <li>• Muhimlik darajasini aniqlaydi</li>
                      <li>• Tegishli tashkilotni taklif qiladi</li>
                      <li>• Spam va noto'g'ri murojaatlarni filtrlaydi</li>
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                Xabar shablonlari
              </CardTitle>
              <CardDescription className="text-slate-500">
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
                <p className="text-xs text-slate-500">
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

              {/* Info */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h5 className="font-medium text-amber-900 mb-2">💡 Qo'llaniladigan o'zgaruvchilar</h5>
                <div className="text-sm text-amber-700 space-y-1">
                  <p><code className="bg-amber-100 px-1 rounded">{'{name}'}</code> - Foydalanuvchi ismi</p>
                  <p><code className="bg-amber-100 px-1 rounded">{'{bot_name}'}</code> - Bot nomi</p>
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
          className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => router.push("/dashboard/telegram-bot/users")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium text-slate-900">Foydalanuvchilar</p>
                <p className="text-sm text-slate-500">
                  {stats?.registered_users || 0} ta ro'yxatdan o'tgan
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => router.push("/dashboard/telegram-bot/appeals")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium text-slate-900">Murojaatlar</p>
                <p className="text-sm text-slate-500">
                  {stats?.pending_appeals || 0} ta kutilmoqda
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => router.push("/dashboard/telegram-bot/regions")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium text-slate-900">Hududlar</p>
                <p className="text-sm text-slate-500">
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
