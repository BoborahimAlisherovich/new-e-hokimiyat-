"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Appeal } from "@/types"
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "./appeal-constants"
import { AIAppealAssistant } from "./ai-appeal-assistant"
import { FileText, Sparkles, MessageSquare } from "lucide-react"

interface AppealDetailDialogProps {
  appeal: Appeal | null
  onClose: () => void
  onUpdate?: () => void
}

export function AppealDetailDialog({ appeal, onClose, onUpdate }: AppealDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("details")

  const handleAIResponse = () => {
    if (onUpdate) onUpdate()
  }

  return (
    <Dialog open={!!appeal} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Мурожаат тафсилотлари
            {appeal && (
              <Badge variant="outline" className="ml-2">
                #{appeal.id}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>Мурожаат ҳақида тўлиқ маълумотлар ва AI ёрдамчиси</DialogDescription>
        </DialogHeader>
        
        {appeal && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Маълумотлар
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Ёрдамчи
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Хабарлар
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Фуқаро</label>
                  <p className="font-medium">{appeal.citizenName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Телефон</label>
                  <p className="font-medium">{appeal.citizenPhone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="font-medium">{appeal.citizenEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ҳудуд</label>
                  <p className="font-medium">{appeal.district}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Мавзу</label>
                <p className="font-medium">{appeal.subject}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Тафсилотлар</label>
                <p className="text-muted-foreground whitespace-pre-wrap">{appeal.description}</p>
              </div>

              <div className="flex gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ҳолат</label>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[appeal.status])}>
                    {STATUS_LABELS[appeal.status]}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Муҳимлик</label>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", PRIORITY_COLORS[appeal.priority])}>
                    {PRIORITY_LABELS[appeal.priority]}
                  </Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-4">
              <AIAppealAssistant
                appealId={Number(appeal.id)}
                appealNumber={String(appeal.id)}
                appealText={appeal.description || appeal.subject || ""}
                currentStatus={appeal.status}
                onSendResponse={handleAIResponse}
              />
            </TabsContent>

            <TabsContent value="messages" className="mt-4">
              <div className="text-center text-muted-foreground py-8">
                Хабарлар тарихи бу ерда кўрсатилади
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Ёпиш
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
