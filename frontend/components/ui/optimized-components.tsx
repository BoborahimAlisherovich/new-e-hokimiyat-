// @ts-nocheck
"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fallback?: string
  className?: string
}

export function LazyImage({ src, alt, fallback, className, ...props }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            img.src = src
            observer.unobserve(img)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [src])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setHasError(true)
  }

  if (hasError && fallback) {
    return <img src={fallback} alt={alt} className={className} {...props} />
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!isLoaded && (
        <div className="absolute inset-0 skeleton rounded-lg" />
      )}
      <img
        ref={imgRef}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  )
}

interface OptimizedComponentProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  delay?: number
}

export function OptimizedComponent({ children, fallback, delay = 200 }: OptimizedComponentProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), delay)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref}>
      {isVisible ? children : (fallback || <div className="skeleton rounded-lg h-32 w-full" />)}
    </div>
  )
}
