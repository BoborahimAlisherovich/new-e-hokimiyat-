"use client"

import { Card, CardContent } from "@/components/ui/card"

type TaskStatsProps = {
  total: number
  pending: number
  inProgress: number
  completed: number
}

export function TaskStats({ total, pending, inProgress, completed }: TaskStatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Жами топшириқлар</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Янги</p>
              <p className="text-2xl font-bold">{pending}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Жараёнда</p>
              <p className="text-2xl font-bold">{inProgress}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Бажарилди</p>
              <p className="text-2xl font-bold">{completed}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
