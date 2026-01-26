// @ts-nocheck
"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
  children?: React.ReactNode
}

export function LoadingSkeleton({ className, children }: LoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="skeleton rounded-lg h-4 w-3/4 mb-2"></div>
      <div className="skeleton rounded-lg h-4 w-1/2"></div>
      {children}
    </div>
  )
}

export function CardSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <Card className={cn("bg-white/70 backdrop-blur-xl border border-gray-200/50", className)}>
      <CardContent className="p-6">
        <LoadingSkeleton />
      </CardContent>
    </Card>
  )
}

export function StatsCardSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <Card className={cn("bg-white/70 backdrop-blur-xl border border-gray-200/50", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="skeleton rounded-lg h-4 w-20"></div>
              <div className="skeleton rounded-lg h-8 w-16"></div>
            </div>
            <div className="skeleton rounded-xl h-14 w-14"></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="skeleton rounded-lg h-3 w-16"></div>
              <div className="skeleton rounded-lg h-3 w-8"></div>
            </div>
            <div className="skeleton rounded-full h-3 w-full"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 5, className }: LoadingSkeletonProps & { rows?: number }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/50">
          <div className="skeleton rounded-lg h-4 w-4"></div>
          <div className="skeleton rounded-lg h-4 flex-1"></div>
          <div className="skeleton rounded-lg h-4 w-20"></div>
          <div className="skeleton rounded-lg h-4 w-16"></div>
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <Card className={cn("bg-white/70 backdrop-blur-xl border border-gray-200/50", className)}>
      <CardContent className="p-6">
        <div className="skeleton rounded-lg h-4 w-32 mb-4"></div>
        <div className="skeleton rounded-lg h-64 w-full"></div>
      </CardContent>
    </Card>
  )
}
