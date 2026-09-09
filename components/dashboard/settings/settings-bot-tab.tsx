"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TabsContent } from "@/components/ui/tabs"
import { Bot, Save, RefreshCw } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { api } from "@/lib/api"

type Translation = ReturnType<typeof useTranslation>

interface SettingsBotTabProps {
  t: Translation
}

interface BotSettings {
  bot_token: string
  bot_username: string
  webhook_url: string
  is_active: boolean
  welcome_message_uz: string
  welcome_message_ru: string
  welcome_message_en: string
  about_text_uz: string
  about_text_ru: string
  about_text_en: string
  help_text_uz: string
  help_text_ru: string
  help_text_en: string
}

export function SettingsBotTab({ t }: SettingsBotTabProps) {
  const [settings, setSettings] = useState<BotSettings>({
    bot_token: "",
    bot_username: "",
    webhook_url: "",
    is_active: false,
    welcome_message_uz: "",
    welcome_message_ru: "",
    welcome_message_en: "",
    about_text_uz: "",
    about_text_ru: "",
    about_text_en: "",
    help_text_uz: "",
    help_text_ru: "",
    help_text_en: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [botStatus, setBotStatus] = useState<{
    is_running: boolean
    last_check: string | null
  } | null>(null)

  useEffect(() => {
    loadSettings()
    checkBotStatus()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const response = await api.get<BotSettings>("/telegram-bot/settings/")
      setSettings(response.data)
    } catch (error) {
      console.error("Error loading bot settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkBotStatus = async () => {
    try {
      const response = await api.get<{ is_active: boolean; is_running: boolean; use_webhook: boolean; pid: number | null }>(
        "/telegram-bot/settings/bot_status/"
      )
      setBotStatus({
        is_running: response.data.is_running,
        last_check: response.data.pid ? new Date().toISOString() : null,
      })
    } catch (error) {
      console.error("Error checking bot status:", error)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await api.put("/telegram-bot/settings/1/", settings)
      alert("Sozlamalar saqlandi")
    } catch (error) {
      console.error("Error saving bot settings:", error)
      alert("Xatolik yuz berdi")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestartBot = async () => {
    try {
      try {
        await api.post("/telegram-bot/settings/stop_bot/")
      } catch (_) {
        // ignore stop errors
      }
      await api.post("/telegram-bot/settings/start_bot/")
      alert("Bot qayta ishga tushirildi")
      setTimeout(checkBotStatus, 2000)
    } catch (error) {
      console.error("Error restarting bot:", error)
      alert("Bot qayta ishga tushirishda xatolik")
    }
  }

  if (isLoading) {
    return (
      <TabsContent value="telegram-bot" className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div>
      </TabsContent>
    )
  }

  return (
    <TabsContent value="telegram-bot" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Telegram Bot sozlamalari
          </CardTitle>
          <CardDescription>
            Telegram bot integratsiyasi uchun sozlamalar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bot_token">Bot Token</Label>
              <Input
                id="bot_token"
                type="password"
                value={settings.bot_token}
                onChange={(e) => setSettings({ ...settings, bot_token: e.target.value })}
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              />
              <p className="text-sm text-muted-foreground">
                @BotFather dan olingan bot token
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bot_username">Bot Username</Label>
              <Input
                id="bot_username"
                value={settings.bot_username}
                onChange={(e) => setSettings({ ...settings, bot_username: e.target.value })}
                placeholder="@mybot"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook_url">Webhook URL</Label>
              <Input
                id="webhook_url"
                value={settings.webhook_url}
                onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                placeholder="https://example.com/api/telegram-webhook"
              />
              <p className="text-sm text-muted-foreground">
                Telegram webhooklari uchun URL
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={settings.is_active}
                onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-border-strong"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Bot faol
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome_message_uz">Welcome matni (UZ)</Label>
              <Textarea
                id="welcome_message_uz"
                value={settings.welcome_message_uz}
                onChange={(e) => setSettings({ ...settings, welcome_message_uz: e.target.value })}
                placeholder="Bot start bosilganda chiqadigan asosiy matn"
                className="min-h-28"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="about_text_uz">"Biz haqimizda" matni (UZ)</Label>
              <Textarea
                id="about_text_uz"
                value={settings.about_text_uz}
                onChange={(e) => setSettings({ ...settings, about_text_uz: e.target.value })}
                placeholder="Botdagi Biz haqimizda bo'limi uchun matn"
                className="min-h-28"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="about_text_ru">"О нас" matni (RU)</Label>
              <Textarea
                id="about_text_ru"
                value={settings.about_text_ru}
                onChange={(e) => setSettings({ ...settings, about_text_ru: e.target.value })}
                placeholder="Текст для раздела О нас"
                className="min-h-28"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="about_text_en">"About us" matni (EN)</Label>
              <Textarea
                id="about_text_en"
                value={settings.about_text_en}
                onChange={(e) => setSettings({ ...settings, about_text_en: e.target.value })}
                placeholder="Text for About us section"
                className="min-h-28"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="help_text_uz">"Yordam" matni (UZ)</Label>
              <Textarea
                id="help_text_uz"
                value={settings.help_text_uz}
                onChange={(e) => setSettings({ ...settings, help_text_uz: e.target.value })}
                placeholder="Botdagi yordam bo'limi uchun matn"
                className="min-h-32"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
            <Button onClick={handleRestartBot} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Botni qayta ishga tushirish
            </Button>
          </div>
        </CardContent>
      </Card>

      {botStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Bot holati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    botStatus.is_running ? "bg-success" : "bg-destructive"
                  }`}
                />
                <span className="font-medium">
                  {botStatus.is_running ? "Ishlayapti" : "To'xtatilgan"}
                </span>
              </div>
              {botStatus.last_check && (
                <p className="text-sm text-muted-foreground">
                  Oxirgi tekshirilgan: {new Date(botStatus.last_check).toLocaleString("uz-UZ")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  )
}
