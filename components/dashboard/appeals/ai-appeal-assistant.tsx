"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Sparkles, Send, RefreshCw, CheckCircle2, AlertTriangle, Clock, Loader2, Copy, Edit2, ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIAnalysis {
  analysis?: string
  score?: number
  priority?: string
  is_valid?: boolean
  suggested_response?: string
  suggested_organizations?: string[]
  keywords?: string[]
  category_suggestion?: string
}

interface AIAppealAssistantProps {
  appealId: number
  appealNumber: string
  appealText: string
  currentStatus: string
  onSendResponse?: (response: string) => void
  className?: string
}

export function AIAppealAssistant({
  appealId,
  appealNumber,
  appealText,
  currentStatus,
  onSendResponse,
  className
}: AIAppealAssistantProps) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [suggestedResponse, setSuggestedResponse] = useState("")
  const [editedResponse, setEditedResponse] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI tahlilini olish
  const fetchAIAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/telegram-bot/appeals/${appealId}/ai_analysis/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      if (!response.ok) throw new Error('AI tahlil qilishda xato')
      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      setError('AI tahlil qilishda xato yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  // AI javob tavsiyasini olish
  const fetchSuggestedResponse = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/telegram-bot/appeals/${appealId}/ai_suggested_response/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      if (!response.ok) throw new Error('AI javob olishda xato')
      const data = await response.json()
      setSuggestedResponse(data.suggested_response)
      setEditedResponse(data.suggested_response)
    } catch (err) {
      setError('AI javob taklifi olishda xato yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  // AI javobini yuborish
  const sendAIResponse = async () => {
    if (!editedResponse.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/telegram-bot/appeals/${appealId}/use_ai_response/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          suggested_text: suggestedResponse,
          edited_text: editedResponse
        })
      })
      if (!response.ok) throw new Error('Javob yuborishda xato')
      if (onSendResponse) {
        onSendResponse(editedResponse)
      }
      setSuggestedResponse("")
      setEditedResponse("")
      setIsEditing(false)
    } catch (err) {
      setError('Javob yuborishda xato yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  // Clipboard-ga nusxalash
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700'
  }

  const priorityLabels: Record<string, string> = {
    low: 'Past',
    medium: 'O\'rtacha',
    high: 'Yuqori',
    critical: 'Juda muhim'
  }

  return (
    <Card className={cn("border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">AI Yordamchi</CardTitle>
          </div>
          <Badge variant="outline" className="bg-purple-100 text-purple-700">
            #{appealNumber}
          </Badge>
        </div>
        <CardDescription>
          Sun'iy intellekt yordamida murojaatni tahlil qiling va javob tayyorlang
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Xato</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* AI Amallar */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAIAnalysis}
            disabled={loading}
            className="border-purple-300 hover:bg-purple-100"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Tahlil qilish
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSuggestedResponse}
            disabled={loading}
            className="border-blue-300 hover:bg-blue-100"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Javob taklifi
          </Button>
        </div>

        {/* AI Tahlil natijasi */}
        {analysis && (
          <div className="space-y-3 rounded-lg border border-purple-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-purple-800">AI Tahlili</h4>
              <div className="flex items-center gap-2">
                {analysis.score !== undefined && (
                  <Badge variant="outline" className="bg-purple-100">
                    Ball: {analysis.score}/100
                  </Badge>
                )}
                {analysis.priority && (
                  <Badge className={priorityColors[analysis.priority]}>
                    {priorityLabels[analysis.priority]}
                  </Badge>
                )}
              </div>
            </div>
            
            {analysis.analysis && (
              <p className="text-sm text-gray-700">{analysis.analysis}</p>
            )}
            
            {analysis.is_valid === false && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Bu murojaat noto'g'ri yoki spam sifatida aniqlandi
                </AlertDescription>
              </Alert>
            )}
            
            {analysis.keywords && analysis.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {analysis.keywords.map((keyword, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
            
            {analysis.suggested_organizations && analysis.suggested_organizations.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Tavsiya etilgan tashkilotlar:</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.suggested_organizations.map((org, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-blue-50">
                      {org}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Javob taklifi */}
        {suggestedResponse && (
          <div className="space-y-3 rounded-lg border border-blue-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-blue-800">AI Javob Taklifi</h4>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(editedResponse)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {isEditing ? (
              <Textarea
                value={editedResponse}
                onChange={(e) => setEditedResponse(e.target.value)}
                rows={5}
                className="resize-none"
                placeholder="Javobni tahrirlang..."
              />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                {editedResponse}
              </p>
            )}
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50">
                  <ThumbsUp className="mr-1 h-4 w-4" />
                  Yaxshi
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                  <ThumbsDown className="mr-1 h-4 w-4" />
                  Yaxshilash kerak
                </Button>
              </div>
              <Button
                onClick={sendAIResponse}
                disabled={loading || !editedResponse.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Yuborish
              </Button>
            </div>
          </div>
        )}

        {/* Holat ko'rsatkichi */}
        <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Holat: {currentStatus}</span>
          </div>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            AI tayyor
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
