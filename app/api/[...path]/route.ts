import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, 'PUT')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, 'PATCH')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, 'DELETE')
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  const path = pathSegments.join('/')
  const search = request.nextUrl.search || ''
  // Django requires trailing slash for POST requests
  const url = `${API_BASE}/api/${path}${path.endsWith('/') ? '' : '/'}${search}`
  
  // Get headers from original request
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    // Hop-by-hop and computed headers should not be forwarded
    const lower = key.toLowerCase()
    if (!['host', 'content-length', 'connection'].includes(lower)) {
      headers[key] = value
    }
  })

  try {
    let body: BodyInit | undefined = undefined
    if (method !== 'GET' && method !== 'DELETE') {
      const contentType = request.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        body = JSON.stringify(await request.json())
      } else {
        body = await request.arrayBuffer()
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
    })

    const responseContentType = response.headers.get('content-type') || 'application/json'
    
    // Binary javoblar uchun (PDF, Excel, rasmlar va h.k.)
    const isBinary = responseContentType.includes('application/pdf') ||
      responseContentType.includes('application/octet-stream') ||
      responseContentType.includes('application/vnd') ||
      responseContentType.includes('image/') ||
      responseContentType.includes('audio/') ||
      responseContentType.includes('video/')
    
    const responseHeaders: Record<string, string> = {
      'Content-Type': responseContentType,
    }
    
    // Content-Disposition header ni saqlaymiz (yuklab olish uchun kerak)
    const contentDisposition = response.headers.get('content-disposition')
    if (contentDisposition) {
      responseHeaders['Content-Disposition'] = contentDisposition
    }
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      responseHeaders['Set-Cookie'] = setCookie
    }

    if (isBinary) {
      const buffer = await response.arrayBuffer()
      return new NextResponse(buffer, {
        status: response.status,
        headers: responseHeaders,
      })
    }

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    )
  }
}
