// @ts-nocheck
"use client"

import Image from "next/image"
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
  const [shouldLoad, setShouldLoad] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const numericWidth = typeof props.width === "number" ? props.width : 1200
  const numericHeight = typeof props.height === "number" ? props.height : 800

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current)
    }

    return () => observer.disconnect()
  }, [src])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setHasError(true)
  }

  return (
    <div ref={wrapperRef} className={cn("relative overflow-hidden", className)}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 skeleton rounded-lg" />
      )}
      {shouldLoad && (
        <Image
          src={hasError && fallback ? fallback : src}
          alt={alt}
          width={numericWidth}
          height={numericHeight}
          unoptimized
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
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
