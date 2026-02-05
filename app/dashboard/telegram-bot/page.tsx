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
import { motion } from "framer-motion";
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

export default function TelegramBotPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [stats, setStats] = useState<BotStats | null>(null);
  const [botStatus, setBotStatus] = useState<{
    is_active: boolean;
    is_running: boolean;
    use_webhook: boolean;
    pid: number | null;
  } | null>(null);

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

  const startBot = useCallback(async () => {
    try {
      setStarting(true);
      const response = await api.post<{ success: boolean; error?: string; message?: string; pid?: number }>("/telegram-bot/settings/start_bot/");
      
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
      await api.put("/telegram-bot/settings/1/", settings);
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

  const deleteWebhook = useCallback(async () => {
    try {
      const response = await api.post<{ success: boolean; error?: string }>("/telegram-bot/settings/delete_webhook/");
      
      if (response.data.success) {
        toast({
          title: "Muvaffaqiyat",
          description: "Webhook o'chirildi"
        });
        setSettings(prev => prev ? { ...prev, use_webhook: false, webhook_url: '' } : null);
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
            <p className="mt-4 text-slate-600">Yuklanmoqda...</p>
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
      <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-500" />
            Telegram Bot
            {/* Bot holati ko'rsatkichi */}
            {botStatus?.is_running ? (
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
          <p className="text-slate-600">
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
          {!settings?.use_webhook && (
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
                  onClick={startBot} 
                  disabled={starting || !settings?.bot_token}
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
      </motion.div>

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
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-slate-600">Foydalanuvchilar</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.registered_users || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-slate-600">Jami murojaatlar</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.total_appeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-slate-600">Kutilmoqda</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.pending_appeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-slate-600">Bugun</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.today_appeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-slate-600">Topshiriq sifatida kiritilgan</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.forwarded_appeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs defaultValue="connection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connection">
            <Link className="h-4 w-4 mr-2" />
            Ulanish
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Brain className="h-4 w-4 mr-2" />
            AI Sozlamalari
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            Xabarlar
          </TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connection">
          <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle>Bot ulanish sozlamalari</CardTitle>
              <CardDescription className="text-slate-600">
                Telegram Bot API ulanish parametrlari
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bot holati</Label>
                  <p className="text-sm text-slate-600">
                    Botni yoqish yoki o'chirish
                  </p>
                </div>
                <Switch 
                  checked={settings?.is_active}
                  onCheckedChange={(checked) => 
                    setSettings(prev => prev ? { ...prev, is_active: checked } : null)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bot_token">Bot Token</Label>
                <div className="flex gap-2">
                  <Input 
                    id="bot_token"
                    type="password"
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={settings?.bot_token || ""}
                    onChange={(e) => 
                      setSettings(prev => prev ? { ...prev, bot_token: e.target.value } : null)
                    }
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    onClick={testConnection}
                    disabled={testing}
                  >
                    {testing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      "Tekshirish"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-slate-600">
                  @BotFather dan olingan token
                </p>
              </div>

              {settings?.bot_username && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-blue-600 dark:text-blue-400">
                    ✅ Bot ulangan: @{settings.bot_username}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="webhook_url">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input 
                    id="webhook_url"
                    placeholder="https://your-domain.com/api/telegram-bot/webhook/"
                    value={settings?.webhook_url || ""}
                    onChange={(e) => 
                      setSettings(prev => prev ? { ...prev, webhook_url: e.target.value } : null)
                    }
                    className="flex-1"
                  />
                  {settings?.use_webhook ? (
                    <Button variant="destructive" onClick={deleteWebhook}>
                      <Unlink className="h-4 w-4 mr-2" />
                      O'chirish
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={setWebhook}>
                      <Link className="h-4 w-4 mr-2" />
                      O'rnatish
                    </Button>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {settings?.use_webhook 
                    ? "✅ Webhook faol" 
                    : "Webhook o'rnatilmagan, polling rejimida ishlaydi"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai">
          <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle>AI tahlil sozlamalari</CardTitle>
              <CardDescription className="text-slate-600">
                Murojaatlarni sun'iy intellekt orqali tahlil qilish
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>AI Provayder</Label>
                <Select 
                  value={settings?.ai_provider || 'disabled'}
                  onValueChange={(value) => 
                    setSettings(prev => prev ? { ...prev, ai_provider: value } : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Provayderni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">O'chirilgan</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-slate-600">
                  {settings?.ai_provider === 'disabled' 
                    ? "AI tahlil o'chirilgan" 
                    : "Murojaatlar avtomatik tahlil qilinadi"
                  }
                </p>
              </div>

              {settings?.ai_provider && settings.ai_provider !== 'disabled' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="ai_api_key">API Kalit</Label>
                    <Input 
                      id="ai_api_key"
                      type="password"
                      placeholder={settings.ai_provider === 'openai' ? "sk-..." : "sk-ant-..."}
                      value={settings?.ai_api_key || ""}
                      onChange={(e) => 
                        setSettings(prev => prev ? { ...prev, ai_api_key: e.target.value } : null)
                      }
                    />
                    {settings?.has_ai_key && (
                      <p className="text-sm text-emerald-600">✅ API kalit saqlangan</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>AI Model</Label>
                    <Select 
                      value={settings?.ai_model || 'gpt-4o-mini'}
                      onValueChange={(value) => 
                        setSettings(prev => prev ? { ...prev, ai_model: value } : null)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Modelni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.ai_provider === 'openai' ? (
                          <>
                            <SelectItem value="gpt-4o-mini">GPT-4o Mini (Tez, arzon)</SelectItem>
                            <SelectItem value="gpt-4o">GPT-4o (Kuchli)</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku (Tez, arzon)</SelectItem>
                            <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                            <SelectItem value="claude-3-opus-20240229">Claude 3 Opus (Kuchli)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle>Xabar shablonlari</CardTitle>
              <CardDescription className="text-slate-600">
                Bot xabarlarini sozlash
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="welcome_uz">Xush kelibsiz xabari (O'zbekcha)</Label>
                <Textarea 
                  id="welcome_uz"
                  rows={4}
                  value={settings?.welcome_message_uz || ""}
                  onChange={(e) => 
                    setSettings(prev => prev ? { ...prev, welcome_message_uz: e.target.value } : null)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome_ru">Xush kelibsiz xabari (Ruscha)</Label>
                <Textarea 
                  id="welcome_ru"
                  rows={4}
                  value={settings?.welcome_message_ru || ""}
                  onChange={(e) => 
                    setSettings(prev => prev ? { ...prev, welcome_message_ru: e.target.value } : null)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card 
          className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => router.push("/dashboard/telegram-bot/users")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium text-slate-900">Foydalanuvchilar</p>
                <p className="text-sm text-slate-600">
                  {stats?.registered_users || 0} ta ro'yxatdan o'tgan
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => router.push("/dashboard/telegram-bot/appeals")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium text-slate-900">Murojaatlar</p>
                <p className="text-sm text-slate-600">
                  {stats?.pending_appeals || 0} ta kutilmoqda
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => router.push("/dashboard/telegram-bot/regions")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium text-slate-900">Hududlar</p>
                <p className="text-sm text-slate-600">
                  Mahalla va qishloqlar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </AdminOnly>
  );
}
