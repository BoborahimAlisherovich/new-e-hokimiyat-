import { PERFORMANCE_CONFIG } from '@/lib/performance-config'

// Service Worker for performance optimization
const CACHE_NAME = 'ehokimiyat-v1'
const STATIC_CACHE = 'static-assets'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/dashboard',
        '/manifest.json',
        // Add other static assets
      ])
    })
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return fetch(request)
  }
  
  // Try cache first for static assets
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.svg')) {
    
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response
        }
        
        return fetch(request).then((networkResponse) => {
          // Cache the successful response
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          
          return networkResponse
        })
      })
    )
  }
  
  // For API calls, go to network
  return fetch(request)
})

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_METRICS') {
    const metrics = event.data.payload
    
    // Send to analytics service
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics)
    }).catch(console.error)
  }
})
