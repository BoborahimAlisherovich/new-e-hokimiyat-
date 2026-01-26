// Performance monitoring configuration
export const PERFORMANCE_CONFIG = {
  // Enable performance monitoring in development
  enabled: process.env.NODE_ENV === 'development',
  
  // Thresholds for performance warnings
  thresholds: {
    renderTime: 16, // ms
    bundleSize: 250, // KB
    memoryUsage: 80, // %
    firstContentfulPaint: 2000, // ms
    largestContentfulPaint: 3000, // ms
  },
  
  // Optimization settings
  optimization: {
    enableVirtualScrolling: true,
    enableImageOptimization: true,
    enableLazyLoading: true,
    enableCodeSplitting: true,
    enableTreeShaking: true,
  },
  
  // Analytics
  analytics: {
    trackPageViews: true,
    trackUserInteractions: true,
    trackPerformanceMetrics: true,
    sampleRate: 0.1, // 10% of users
  }
}

// Performance monitoring utilities
export const measureRenderTime = (componentName: string) => {
  const start = performance.now()
  
  return {
    end: () => {
      const end = performance.now()
      const duration = end - start
      
      if (PERFORMANCE_CONFIG.enabled && duration > PERFORMANCE_CONFIG.thresholds.renderTime) {
        console.warn(`⚠️ ${componentName} slow render: ${duration}ms`)
      }
      
      return duration
    }
  }
}

export const measureBundleSize = () => {
  if (typeof window !== 'undefined') {
    const resources = performance.getEntriesByType('resource')
    const bundleSize = resources.reduce((total, entry) => {
      if (entry.name.includes('.js') || entry.name.includes('.css')) {
        return total + entry.transferSize
      }
      return total
    }, 0)
    
    const sizeInKB = bundleSize / 1024
    
    if (sizeInKB > PERFORMANCE_CONFIG.thresholds.bundleSize) {
      console.warn(`⚠️ Large bundle size: ${sizeInKB.toFixed(2)}KB`)
    }
    
    return sizeInKB
  }
}

export const trackUserInteraction = (action: string, element?: string) => {
  if (PERFORMANCE_CONFIG.enabled && PERFORMANCE_CONFIG.analytics.trackUserInteractions) {
    console.log(`👆 User interaction: ${action}`, element ? `on ${element}` : '')
  }
}
