import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

interface NotificationActionsProps {
  filter: "all" | "unread"
  onFilterChange: (value: "all" | "unread") => void
  totalCount: number
  unreadCount: number
  onMarkAllAsRead: () => void
}

export function NotificationActions({
  filter,
  onFilterChange,
  totalCount,
  unreadCount,
  onMarkAllAsRead,
}: NotificationActionsProps) {
  const t = useTranslation()
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 rounded-2xl p-4 border border-blue-100/50 shadow-sm">
      <Tabs value={filter} onValueChange={(value) => onFilterChange(value as "all" | "unread")}>
        <TabsList className="gap-2 p-1 bg-white/80 rounded-xl shadow-inner">
          <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white px-4 py-2.5 rounded-lg transition-all duration-200 font-medium">
            {t.notifications.tabsAll}
            <Badge variant="secondary" className="ml-1.5 bg-indigo-50/50 text-slate-700 text-xs">
              {totalCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white px-4 py-2.5 rounded-lg transition-all duration-200 font-medium">
            {t.notifications.tabsUnread}
            {unreadCount > 0 && <Badge className="ml-1.5 bg-red-500 text-white text-xs">{unreadCount}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {unreadCount > 0 && (
        <Button 
          variant="outline" 
          onClick={onMarkAllAsRead}
          className="bg-white/80 border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-blue-700 font-medium shadow-sm transition-all duration-200"
        >
          <Check className="mr-2 h-4 w-4" />
          {t.notifications.markAllRead}
        </Button>
      )}
    </div>
  )
}
