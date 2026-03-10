"use client"

import { Header } from "@/components/layout/header"
import { Tabs } from "@/components/ui/tabs"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useI18n, useTranslation, type Language } from "@/lib/i18n/context"
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
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { api } from "@/lib/api"
import { canAccessSettingsTab, getAllowedSettingsTabs, type SettingsTabKey } from "@/lib/settings-access"
import { useRouter, useSearchParams } from "next/navigation"

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslation()
  const { language, setLanguage } = useI18n()
  const { toast } = useToast()
  const pageRef = useGSAPPageEntrance()
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

      if (canAccessSettingsTab(user.role, "admin")) {
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
  const userRole = currentUser?.role ?? null
  const allowedTabs = useMemo(() => getAllowedSettingsTabs(userRole), [userRole])
  const requestedTab = searchParams.get("tab") as SettingsTabKey | null
  const resolvedTab = requestedTab && allowedTabs.includes(requestedTab) ? requestedTab : allowedTabs[0]
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("profile")

  useEffect(() => {
    setActiveTab(resolvedTab)
  }, [resolvedTab])

  const handleTabChange = (value: string) => {
    const nextTab = value as SettingsTabKey
    setActiveTab(nextTab)
    router.replace(`/dashboard/settings?tab=${nextTab}`, { scroll: false })
  }

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
    login: currentUser.login || "",
    firstName: currentUser.first_name || "",
    lastName: currentUser.last_name || "",
    middleName: currentUser.middle_name || "",
    phone: currentUser.phone || "",
    pnfl: currentUser.masked_pnfl || currentUser.pnfl || "",
    role: currentUser.role || "USER",
    avatar_url: currentUser.avatar_url || null,
  } : {
    login: "",
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
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="mt-4 text-slate-500">{t.common.loading}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.settings.title} description={t.settings.description} />
      <div className="p-4 sm:p-6">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-purple-400/8 to-transparent rounded-full blur-2xl" />
        </div>
        <div ref={pageRef} className="relative z-10 mx-auto max-w-5xl">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <section data-gsap-section>
              <SettingsTabs t={t} isAdmin={isAdmin} userRole={currentUser?.role} />
            </section>
            <section data-gsap-section>
              <SettingsProfileTab t={t} currentUser={userForProfile} onUserUpdate={loadData} />
            </section>
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
            <SettingsAppearanceTab t={t} language={language} onLanguageChange={(value) => setLanguage(value as Language)} onSave={saveSettings} saving={saving} />
            
            {/* Admin-only tabs */}
            {canAccessSettingsTab(userRole, "sectors") && <SettingsSectorsTab t={t} />}

            {canAccessSettingsTab(userRole, "admin") && isAdmin && (
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
        </div>
      </div>
    </>
  )
}
