"use client"

import React from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User,
  Bell,
  Shield,
  Globe,
  Smartphone,
  Mail,
  MessageSquare,
  Save,
  UserCheck,
  Bot,
  Settings,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/i18n/context"
import { getSettings, getUsers, postSettings } from "@/lib/api"

export default function SettingsPage() {
  const t = useTranslation()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [telegramNotifications, setTelegramNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [taskDeadlineReminder, setTaskDeadlineReminder] = useState(true)
  const [newTaskNotification, setNewTaskNotification] = useState(true)
  const [language, setLanguage] = useState("uz")

  const [botToken, setBotToken] = useState("")
  const [botUsername, setBotUsername] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [tokenSaved, setTokenSaved] = useState(false)
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("")
  const [senderEmail, setSenderEmail] = useState("")

  useEffect(() => {
    let mounted = true
    try {
      const lsLang = localStorage.getItem("language")
      if (lsLang) setLanguage(lsLang)
    } catch (e) {}
    getSettings()
      .then((s) => {
        if (!mounted) return
        setBotToken(s.telegramBotToken || "")
        setBotUsername(s.telegramBotUsername || "")
        setSmtpHost(s.emailSmtpHost || "")
        setSmtpPort(String(s.emailSmtpPort || ""))
        setSenderEmail(s.emailSenderAddress || "")
        setLanguage(s.language || language)
      })
      .catch(() => {})
    getUsers()
      .then((users) => {
        if (!mounted) return
        const current = users.results.find((u: any) => u.role === "ADMIN") || users.results[0]
        if (current) {
          // prefill some profile fields
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    try {
      document.documentElement.lang = language || "uz"
      localStorage.setItem("language", language)
    } catch (e) {}
  }, [language])

  const currentUser = { firstName: "Admin", lastName: "User", middleName: "", phone: "", pnfl: "12345678901234", role: "ADMIN" }
  const isAdmin = currentUser.role === "ADMIN"

  // Mock data for applications (Murojatlar)
  const [applications] = useState([
    { id: 1, fullName: "Abdulla Karimov", subject: "Ish o'rnini o'zgartirish", status: "Ko'rilmoqda", date: "2024-01-15", priority: "Yuqori" },
    { id: 2, fullName: "Zarina Toshmatova", subject: "Ta'til berish", status: "Qabul qilindi", date: "2024-01-14", priority: "O'rta" },
    { id: 3, fullName: "Bekzod Rahimov", subject: "Maosh to'g'risida", status: "Jarayonda", date: "2024-01-13", priority: "Past" },
    { id: 4, fullName: "Dilnoza Azimova", subject: "Ishga qabul qilish", status: "Yangi", date: "2024-01-12", priority: "Yuqori" },
  ])

  // Mock data for tasks (Topshiriqlar)
  const [tasks] = useState([
    { id: 1, title: "Hisobot tayyorlash", assignee: "Abdulla Karimov", deadline: "2024-01-20", status: "Jarayonda", priority: "Yuqori" },
    { id: 2, title: "Rejalashtirish", assignee: "Zarina Toshmatova", deadline: "2024-01-18", status: "Bajarildi", date: "2024-01-16", priority: "O'rta" },
    { id: 3, title: "Hujjatlar tekshiruvi", assignee: "Bekzod Rahimov", deadline: "2024-01-22", status: "Boshlanmadi", date: "2024-01-17", priority: "Past" },
    { id: 4, title: "Uchrashuv tashkil etish", assignee: "Dilnoza Azimova", deadline: "2024-01-19", status: "Jarayonda", date: "2024-01-15", priority: "Yuqori" },
  ])

  const saveBotSettings = () => {
    // Persist bot settings
    postSettings({ telegramBotToken: botToken, telegramBotUsername: botUsername }).catch(() => {})
    setTokenSaved(true)
    setTimeout(() => setTokenSaved(false), 3000)
  }

  const [settingsSaved, setSettingsSaved] = useState(false)

  const saveSettings = async () => {
    const body: any = {
      language,
      emailNotifications,
      telegramNotifications,
      pushNotifications,
      newTaskNotification,
      taskDeadlineReminder,
      telegramBotToken: botToken,
      telegramBotUsername: botUsername,
      emailSmtpHost: smtpHost,
      emailSmtpPort: smtpPort ? Number(smtpPort) : undefined,
      emailSenderAddress: senderEmail,
    }
    try {
      await postSettings(body)
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (e) {
      // ignore for now
    }
  }

  return (
    <React.Fragment>
      <Header title={t.settings.title} description={t.settings.description} />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="flex space-x-1 border-b border-gray-200">
              <TabsTrigger 
                value="profile" 
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
              >
                <User className="h-4 w-4 mr-2" />
                {t.settings.profile}
              </TabsTrigger>
              
              <TabsTrigger 
                value="notifications" 
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
              >
                <Bell className="h-4 w-4 mr-2" />
                {t.settings.notifications}
              </TabsTrigger>
              
              <TabsTrigger 
                value="security" 
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
              >
                <Shield className="h-4 w-4 mr-2" />
                {t.settings.security}
              </TabsTrigger>
              
              <TabsTrigger 
                value="appearance" 
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
              >
                <Globe className="h-4 w-4 mr-2" />
                {t.settings.appearance}
              </TabsTrigger>
              
              <TabsTrigger 
                value="applications" 
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
              >
                <Mail className="h-4 w-4 mr-2" />
                Murojatlar
              </TabsTrigger>
              
              <TabsTrigger 
                value="tasks" 
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                Topshiriqlar
              </TabsTrigger>
              
              {isAdmin && (
                <TabsTrigger 
                  value="admin" 
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-emerald-600 data-[state=active]:border-emerald-600 transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t.settings.admin}
                </TabsTrigger>
              )}
            </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="mt-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {t.settings.profile}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {t.settings.profileDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-emerald-600 text-white text-lg font-medium">
                      AK
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Abdulla Karimov</h3>
                    <p className="text-sm text-gray-600">admin@ehokimiyat.uz</p>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white animate-bounce-subtle" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-emerald-600 bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                    {currentUser.firstName} {currentUser.lastName}
                  </h3>
                  <p className="text-lg text-muted-foreground">{currentUser.role}</p>
                  <Badge variant="outline" className="mt-3 bg-emerald-50 text-emerald-600 border-emerald-200 px-4 py-2">
                    <UserCheck className="mr-2 h-4 w-4" />
                    {t.settings.oneIDConnected}
                  </Badge>
                </div>

                <Separator className="my-8" />

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">{t.settings.firstName}</Label>
                    <Input 
                      defaultValue={currentUser.firstName} 
                      className="h-12 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">{t.settings.lastName}</Label>
                    <Input 
                      defaultValue={currentUser.lastName} 
                      className="h-12 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">{t.settings.middleName}</Label>
                    <Input 
                      defaultValue={currentUser.middleName} 
                      className="h-12 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">{t.settings.phone}</Label>
                    <Input 
                      defaultValue={currentUser.phone || ""} 
                      className="h-12 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-3 sm:col-span-2">
                    <Label className="text-sm font-medium text-gray-700">{t.settings.email}</Label>
                    <Input 
                      defaultValue="user@gov.uz" 
                      type="email" 
                      className="h-12 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button 
                    onClick={saveSettings}
                    className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-250 hover:scale-105"
                  >
                    <Save className="mr-2 h-5 w-5" />
                    {t.common.save}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="animate-fade-in">
            <Card className="bg-white border border-gray-200 shadow-sm hover:border-emerald-300 transition-all duration-250">
              <CardHeader className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-emerald-600/3 to-emerald-700/5" />
                <CardTitle className="relative flex items-center gap-3 text-2xl">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  {t.settings.notificationSettings}
                </CardTitle>
                <CardDescription className="relative">{t.settings.notificationDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                <div className="space-y-6">
                  <h4 className="text-xl font-semibold text-emerald-600 bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                    {t.settings.notificationChannels}
                  </h4>

                  <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 p-6 bg-emerald-50 hover:bg-emerald-100 transition-all duration-250">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-medium">{t.settings.emailNotifications}</p>
                        <p className="text-sm text-muted-foreground">{t.settings.emailNotificationsDesc}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={emailNotifications} 
                      onCheckedChange={setEmailNotifications}
                      className="scale-125"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 p-6 bg-emerald-50 hover:bg-emerald-100 transition-all duration-250">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                        <MessageSquare className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-medium">{t.settings.telegramNotifications}</p>
                        <p className="text-sm text-muted-foreground">{t.settings.telegramNotificationsDesc}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={telegramNotifications} 
                      onCheckedChange={setTelegramNotifications}
                      className="scale-125"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 p-6 bg-amber-50 hover:bg-amber-100 transition-all duration-250">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 shadow-sm">
                        <Smartphone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-medium">{t.settings.pushNotifications}</p>
                        <p className="text-sm text-muted-foreground">{t.settings.pushNotificationsDesc}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={pushNotifications} 
                      onCheckedChange={setPushNotifications}
                      className="scale-125"
                    />
                  </div>
                </div>

                <Separator className="my-8" />

                <div className="space-y-6">
                  <h4 className="font-medium text-emerald-600">
                    {t.settings.notificationTypes}
                  </h4>
                  <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 p-6 bg-emerald-50 hover:bg-emerald-100 transition-all duration-250">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                        <AlertCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-medium">{t.settings.newTasks}</p>
                        <p className="text-sm text-muted-foreground">{t.settings.newTasksDesc}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={newTaskNotification} 
                      onCheckedChange={setNewTaskNotification}
                      className="scale-125"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 p-6 bg-emerald-50 hover:bg-emerald-100 transition-all duration-250">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                        <AlertCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-medium">{t.settings.deadlineReminders}</p>
                        <p className="text-sm text-muted-foreground">{t.settings.deadlineRemindersDesc}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={taskDeadlineReminder} 
                      onCheckedChange={setTaskDeadlineReminder}
                      className="scale-125"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button 
                    onClick={saveSettings}
                    className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-250 hover:scale-105"
                  >
                    <Save className="mr-2 h-5 w-5" />
                    {t.common.save}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t.settings.securitySettings}</CardTitle>
                <CardDescription>{t.settings.securityDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{t.settings.oneIDAuth}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t.settings.oneIDAuthDesc}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                      {t.settings.active}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{t.settings.pnfl}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{t.settings.pnflDesc}</p>
                    </div>
                      <code className="rounded bg-muted px-3 py-1 font-mono text-sm">
                      ***{(currentUser.pnfl ?? "").slice(-4)}
                    </code>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-medium mb-2">{t.settings.activeSessions}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-accent" />
                        <span>{t.settings.currentSession}</span>
                      </div>
                      <span className="text-muted-foreground">{t.settings.now}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        <span>{t.settings.hoursAgo}</span>
                      </div>
                      <span className="text-muted-foreground">2 {t.settings.hoursAgo}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 bg-transparent">
                    {t.settings.terminateOtherSessions}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t.settings.appearanceSettings}</CardTitle>
                <CardDescription>{t.settings.appearanceDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>{t.settings.language}</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v)}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-white border border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                      <Globe className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uz">O'zbek tili (lotin)</SelectItem>
                      <SelectItem value="uz-cyrl">Ўзбек тили (кирилл)</SelectItem>
                      <SelectItem value="ru">Русский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveSettings} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Save className="mr-2 h-4 w-4" />
                    {t.common.save}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications (Murojatlar) */}
          <TabsContent value="applications">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Murojatlar
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Barcha kelgan murojatlar ro'yxati
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>F.I.O</TableHead>
                      <TableHead>Mavzu</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sana</TableHead>
                      <TableHead>Muhimlik</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>{app.id}</TableCell>
                        <TableCell>{app.fullName}</TableCell>
                        <TableCell>{app.subject}</TableCell>
                        <TableCell>
                          <Badge variant={app.status === "Yangi" ? "default" : app.status === "Qabul qilindi" ? "secondary" : "outline"}>
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{app.date}</TableCell>
                        <TableCell>
                          <Badge variant={app.priority === "Yuqori" ? "destructive" : app.priority === "O'rta" ? "default" : "secondary"}>
                            {app.priority}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks (Topshiriqlar) */}
          <TabsContent value="tasks">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Topshiriqlar
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Barcha topshiriqlar ro'yxati
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Sarlavha</TableHead>
                      <TableHead>Mas'ul</TableHead>
                      <TableHead>Muddat</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Muhimlik</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.id}</TableCell>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{task.assignee}</TableCell>
                        <TableCell>{task.deadline}</TableCell>
                        <TableCell>
                          <Badge variant={task.status === "Bajarildi" ? "default" : task.status === "Jarayonda" ? "secondary" : "outline"}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={task.priority === "Yuqori" ? "destructive" : task.priority === "O'rta" ? "default" : "secondary"}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin">
              <div className="space-y-6">
                {/* Telegram Bot Settings */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      {t.settings.telegramBotSettings}
                    </CardTitle>
                    <CardDescription>{t.settings.telegramBotDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert className="border-emerald-200 bg-emerald-50">
                      <AlertCircle className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-sm">
                        {t.settings.createBot}
                      </AlertDescription>
                    </Alert>

                    {tokenSaved && (
                      <Alert className="border-emerald-200 bg-emerald-50">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <AlertDescription className="text-sm text-emerald-600">
                          {t.settings.settingsSaved}!
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="botToken">{t.settings.botToken}</Label>
                        <div className="relative">
                          <Input
                            id="botToken"
                            type={showToken ? "text" : "password"}
                            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                            value={botToken}
                            onChange={(e) => setBotToken(e.target.value)}
                            className="font-mono pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowToken(!showToken)}
                          >
                            {showToken ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.settings.botTokenDesc}</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="botUsername">{t.settings.botUsername}</Label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-muted text-muted-foreground text-sm">
                            @
                          </span>
                          <Input
                            id="botUsername"
                            placeholder="hokimlik_bot"
                            value={botUsername}
                            onChange={(e) => setBotUsername(e.target.value)}
                            className="rounded-l-none"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{t.settings.botUsernameDesc}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button onClick={saveBotSettings}>
                        <Save className="mr-2 h-4 w-4" />
                        {t.common.save}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Email SMTP Settings */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      {t.settings.emailSettings}
                    </CardTitle>
                    <CardDescription>{t.settings.emailSettingsDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="smtpHost">{t.settings.smtpServer}</Label>
                        <Input
                          id="smtpHost"
                          placeholder="smtp.example.com"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPort">{t.settings.port}</Label>
                        <Input
                          id="smtpPort"
                          placeholder="587"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="senderEmail">{t.settings.senderEmail}</Label>
                        <Input
                          id="senderEmail"
                          type="email"
                          placeholder="noreply@hokimlik.uz"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button>
                        <Save className="mr-2 h-4 w-4" />
                        {t.common.save}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
        </div>
      </div>
    </React.Fragment>
  )
}
