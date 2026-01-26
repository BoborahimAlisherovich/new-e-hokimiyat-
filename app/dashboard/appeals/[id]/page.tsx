"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAppealById, getOrganizations } from "@/lib/api"
import { mockAppeals } from "@/lib/mock-data"
import { ArrowLeft, Send, Calendar, Building2, User, Clock } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"

export default function AppealDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [appeal, setAppeal] = useState<any | null>(null)
  const [isResponseOpen, setIsResponseOpen] = useState(false)
  const [response, setResponse] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Mock data for demo
  const mockAppeal = mockAppeals.find(appeal => appeal.id === id) || null

  useEffect(() => {
    setAppeal(mockAppeal)
  }, [id])

  const handleSubmitResponse = async () => {
    if (!response.trim()) return
    
    setIsSubmitting(true)
    // Mock response submission
    setTimeout(() => {
      setIsResponseOpen(false)
      setResponse("")
      setIsSubmitting(false)
      // Update appeal status
      if (appeal) {
        setAppeal({
          ...appeal,
          status: "JAVOB_BERILDI",
          response: response,
          responseDate: new Date().toISOString()
        })
      }
    }, 1000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "YANGI": return "bg-blue-100 text-blue-800"
      case "QAYTA_YUBORILDI": return "bg-yellow-100 text-yellow-800"
      case "IJRODA": return "bg-orange-100 text-orange-800"
      case "JAVOB_BERILDI": return "bg-green-100 text-green-800"
      case "YOPILDI": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "YANGI": return "Янги"
      case "QAYTA_YUBORILDI": return "Қайта юборилди"
      case "IJRODA": return "Ижрода"
      case "JAVOB_BERILDI": return "Жавоб берилди"
      case "YOPILDI": return "Ёпилди"
      default: return "Номаълум"
    }
  }

  if (!appeal) {
    return (
      <>
        <Header title="Мурожаатлар" description="Мурожаат тafsilotи" />
        <div className="min-h-screen bg-background pt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Мурожаат юкланмоқда...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Мурожаат тafsilotи" description={`${appeal.citizenName} томидаги мурожаат`} />
      <div className="min-h-screen bg-background pt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 py-8">
            {/* Back Button */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between w-full">
                <Link href="/dashboard/appeals">
                  <Button variant="outline" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Оркага қайтиш
                  </Button>
                </Link>
              </div>
            </div>

            {/* Appeal Details */}
            <Card className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">{appeal.subject} - Мурожаат тafsilotи</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Citizen Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-foreground">Фуқаро номи</Label>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {appeal.citizenName?.charAt(0) || "F"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground">{appeal.citizenName}</div>
                        <div className="text-sm text-muted-foreground">{appeal.citizenPhone}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-foreground">Мурожаат санаси</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{formatDate(appeal.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Appeal Content */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-foreground">Мурожаат мавзуси</Label>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-2">{appeal.subject}</h3>
                    <p className="text-foreground leading-relaxed">{appeal.description}</p>
                  </div>
                </div>

                {/* Appeal Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground">Ташкилот</Label>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">Тошкент шаҳар ҳокимлиги</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Категория</Label>
                    <Badge className="bg-primary/10 text-primary">
                      {appeal.category}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Муҳимлик</Label>
                    <Badge className={cn(
                      "px-3 py-1 text-xs font-medium",
                      appeal.priority === "MUHIM_SHOSHILINCH" && "bg-red-100 text-red-800",
                      appeal.priority === "MUHIM" && "bg-orange-100 text-orange-800",
                      appeal.priority === "SHOSHILINCH_EMAS" && "bg-yellow-100 text-yellow-800",
                      appeal.priority === "ODDIY" && "bg-gray-100 text-gray-800"
                    )}>
                      {appeal.priority}
                    </Badge>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-foreground">Ҳолати</Label>
                  <div className="flex items-center gap-3">
                    <Badge className={cn(
                      "px-4 py-2 text-sm font-medium",
                      getStatusColor(appeal.status)
                    )}>
                      {getStatusText(appeal.status)}
                    </Badge>
                    {appeal.responseDate && (
                      <span className="text-sm text-muted-foreground ml-3">
                        Жавоб: {formatDate(appeal.responseDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Response Section */}
                {appeal.status !== "YOPILDI" && appeal.status !== "JAVOB_BERILDI" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground">Жавоб</Label>
                      <Dialog open={isResponseOpen} onOpenChange={setIsResponseOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-primary text-primary-foreground">
                            Жавоб ёзиш
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-foreground">Жавоб ёзиш</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                              Мурожаатга жавобингизни киритинг
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="response">Жавоб матни</Label>
                              <Textarea
                                id="response"
                                placeholder="Жавобингизни бу ерда киритинг..."
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                                className="min-h-[120px] bg-background/50 border-border/50 focus:bg-background focus:border-primary transition-all"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsResponseOpen(false)}>
                              Бекор қилиш
                            </Button>
                            <Button onClick={handleSubmitResponse} disabled={isSubmitting}>
                              {isSubmitting ? "Жўнатилмоқда..." : "Жавоб юбориш"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}

                {/* Response Display */}
                {appeal.response && (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-foreground">Жавоб матни</Label>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-foreground leading-relaxed">{appeal.response}</p>
                      <div className="text-sm text-muted-foreground mt-2">
                        Жавоб санаси: {formatDate(appeal.responseDate)}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
