"use client"

import { Header } from "@/components/layout/header"
import { Tabs } from "@/components/ui/tabs"
import { useState, useEffect, useCallback } from "react"
import { useI18n, useTranslation } from "@/lib/i18n/context"
import { getCurrentUser } from "@/lib/api"
import { User } from "@/types"
import { SettingsTabs } from "@/components/dashboard/settings/settings-tabs"
import { SettingsProfileTab } from "@/components/dashboard/settings/settings-profile-tab"
import { SettingsNotificationsTab } from "@/components/dashboard/settings/settings-notifications-tab"
import { SettingsSecurityTab } from "@/components/dashboard/settings/settings-security-tab"
import { SettingsAppearanceTab } from "@/components/dashboard/settings/settings-appearance-tab"
import { SettingsSectorsTab } from "@/components/dashboard/settings/settings-sectors-tab"
import { SettingsAdminTab } from "@/components/dashboard/settings/settings-admin-tab"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { api } from "@/lib/api"

export default function SettingsPage() {
  const t = useTranslation()
  const { language, setLanguage } = useI18n()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Notification settings (stored locally for now)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [telegramNotifications, setTelegramNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [taskDeadlineReminder, setTaskDeadlineReminder] = useState(true)
  const [newTaskNotification, setNewTaskNotification] = useState(true)

  const [botToken, setBotToken] = useState("")
  const [botUsername, setBotUsername] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [tokenSaved, setTokenSaved] = useState(false)
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("")
  const [senderEmail, setSenderEmail] = useState("")

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      setCurrentUser(user)

      try {
        const botSettingsRes = await api.get<{ bot_token?: string; bot_username?: string }>(
          "/telegram-bot/settings/"
        )
        if (typeof botSettingsRes.data?.bot_token === "string") {
          setBotToken(botSettingsRes.data.bot_token)
        }
        if (typeof botSettingsRes.data?.bot_username === "string") {
          setBotUsername(botSettingsRes.data.bot_username)
        }
      } catch (error) {
        // ignore bot settings load errors for now
      }
      
      // Load settings from localStorage
      const savedNotifications = localStorage.getItem("notifications")
      if (savedNotifications) {
        try {
          const notif = JSON.parse(savedNotifications)
          setEmailNotifications(notif.email ?? true)
          setTelegramNotifications(notif.telegram ?? true)
          setPushNotifications(notif.push ?? false)
          setTaskDeadlineReminder(notif.deadline ?? true)
          setNewTaskNotification(notif.newTask ?? true)
        } catch (e) {}
      }
    } catch (error) {
      console.error("Failed to load user:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    document.documentElement.lang = language || "uz"
  }, [language])

  const isAdmin = currentUser?.role === "ADMIN"
  const isHokim = currentUser?.role === "HOKIM" || currentUser?.role === "HOKIM_YORDAMCHISI"
  const isHokimlikMasul = currentUser?.role === "HOKIMLIK_MASUL"
  const isTashkilotRahbar = currentUser?.role === "TASHKILOT_RAHBAR"
  const showAdminTabs = isAdmin || isHokim

  const saveAdminSettings = async () => {
    try {
      await api.put("/telegram-bot/settings/1/", {
        bot_token: botToken,
        bot_username: botUsername,
      })
      setTokenSaved(true)
      setTimeout(() => setTokenSaved(false), 3000)
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.settings.adminSaveError,
        variant: "destructive",
      })
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Save notification settings to localStorage
      const notificationSettings = {
        email: emailNotifications,
        telegram: telegramNotifications,
        push: pushNotifications,
        deadline: taskDeadlineReminder,
        newTask: newTaskNotification,
      }
      localStorage.setItem("notifications", JSON.stringify(notificationSettings))
      localStorage.setItem("language", language)
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      toast({
        title: t.common.success,
        description: t.settings.settingsSaved,
      })
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.settings.saveError,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const userForProfile = currentUser ? {
    id: currentUser.id,
    firstName: currentUser.first_name || "",
    lastName: currentUser.last_name || "",
    middleName: currentUser.middle_name || "",
    phone: currentUser.phone || "",
    pnfl: currentUser.pnfl || "",
    role: currentUser.role || "USER",
    avatar_url: currentUser.avatar_url || null,
  } : {
    firstName: "",
    lastName: "",
    middleName: "",
    phone: "",
    pnfl: "",
    role: "USER",
  }

  if (loading) {
    return (
      <>
        <Header title={t.settings.title} description={t.settings.description} />
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-700">{t.common.loading}</p>
            </motion.div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.settings.title} description={t.settings.description} />
      <div className="p-6">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-purple-400/8 to-transparent rounded-full blur-2xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto relative z-10"
        >
          <Tabs defaultValue="profile" className="space-y-6">
            <SettingsTabs t={t} isAdmin={isAdmin} userRole={currentUser?.role} />
            <SettingsProfileTab t={t} currentUser={userForProfile} onUserUpdate={loadData} />
            <SettingsNotificationsTab
              t={t}
              emailNotifications={emailNotifications}
              onEmailChange={setEmailNotifications}
              telegramNotifications={telegramNotifications}
              onTelegramChange={setTelegramNotifications}
              pushNotifications={pushNotifications}
              onPushChange={setPushNotifications}
              newTaskNotification={newTaskNotification}
              onNewTaskChange={setNewTaskNotification}
              taskDeadlineReminder={taskDeadlineReminder}
              onDeadlineChange={setTaskDeadlineReminder}
              onSave={saveSettings}
              saving={saving}
            />
            <SettingsSecurityTab t={t} currentUser={userForProfile} />
            <SettingsAppearanceTab t={t} language={language} onLanguageChange={setLanguage} onSave={saveSettings} saving={saving} />
            
            {/* Admin-only tabs */}
            {showAdminTabs && (
              <>
                {(currentUser?.role === "ADMIN" || currentUser?.role === "HOKIM" || currentUser?.role === "HOKIM_YORDAMCHISI" || currentUser?.role === "HOKIMLIK_MASUL") && (
                  <SettingsSectorsTab t={t} />
                )}
              </>
            )}

            {isAdmin && (
              <SettingsAdminTab
                t={t}
                botToken={botToken}
                botUsername={botUsername}
                showToken={showToken}
                tokenSaved={tokenSaved}
                smtpHost={smtpHost}
                smtpPort={smtpPort}
                senderEmail={senderEmail}
                onBotTokenChange={setBotToken}
                onBotUsernameChange={setBotUsername}
                onShowTokenToggle={() => setShowToken((prev) => !prev)}
                onSaveBotSettings={saveAdminSettings}
                onSmtpHostChange={setSmtpHost}
                onSmtpPortChange={setSmtpPort}
                onSenderEmailChange={setSenderEmail}
              />
            )}
          </Tabs>
        </motion.div>
      </div>
    </>
  )
}
