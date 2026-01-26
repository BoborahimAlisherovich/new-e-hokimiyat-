"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface OptimizedSectionProps {
  children: React.ReactNode
  className?: string
  delay?: number
  threshold?: number
}

export function OptimizedSection({ children, className, delay = 0, threshold = 0.1 }: OptimizedSectionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasBeenVisible, setHasBeenVisible] = useState(false)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (!hasBeenVisible) {
            setHasBeenVisible(true)
          }
        }
      },
      { threshold }
    )
    
    const element = document.getElementById(`optimized-section-${delay}`)
    if (element) {
      observer.observe(element)
    }
    
    return () => observer.disconnect()
  }, [delay, threshold, hasBeenVisible])
  
  return (
    <div 
      id={`optimized-section-${delay}`}
      className={cn(
        "transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          hasError ? "hidden" : ""
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  )
}

export function MemoizedCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-md hover:shadow-xl transition-all duration-300", className)}
      {...props}
    >
      {children}
    </div>
  )
}
