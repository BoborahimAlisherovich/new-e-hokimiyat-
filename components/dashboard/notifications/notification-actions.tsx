import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check } from "lucide-react"

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
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Tabs value={filter} onValueChange={(value) => onFilterChange(value as "all" | "unread")}>
        <TabsList>
          <TabsTrigger value="all">
            Barchasi
            <Badge variant="secondary" className="ml-2">
              {totalCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread">
            O'qilmagan
            {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {unreadCount > 0 && (
        <Button variant="outline" onClick={onMarkAllAsRead}>
          <Check className="mr-2 h-4 w-4" />
          Barchasini o'qilgan deb belgilash
        </Button>
      )}
    </div>
  )
}
