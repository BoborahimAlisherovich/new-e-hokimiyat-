import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function NotificationsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-4 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[300px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
