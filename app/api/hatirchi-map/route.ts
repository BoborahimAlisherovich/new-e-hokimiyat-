import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

interface MapPathItem {
  id: string
  name: string
  path: string
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")

const extractPaths = (html: string): MapPathItem[] => {
  const pathTagRegex = /<path\b[^>]*>/gi
  const classRegex = /class="([^"]+)"/i
  const dRegex = /d="([^"]+)"/i
  const nameRegex = /highcharts-name-([^\s"]+)/i

  const entries: MapPathItem[] = []
  const tags = html.match(pathTagRegex) || []

  tags.forEach((tag) => {
    const classMatch = tag.match(classRegex)
    const dMatch = tag.match(dRegex)
    if (!classMatch || !dMatch) return

    const classValue = classMatch[1]
    const nameMatch = classValue.match(nameRegex)
    if (!nameMatch) return

    const rawName = nameMatch[1]
    const name = rawName.includes("%") ? decodeURIComponent(rawName) : rawName
    const id = slugify(name) || name
    const pathData = dMatch[1]

    entries.push({ id, name, path: pathData })
  })

  const byName = new Map<string, MapPathItem>()
  for (const entry of entries) {
    const existing = byName.get(entry.name)
    if (!existing || entry.path.length > existing.path.length) {
      byName.set(entry.name, entry)
    }
  }

  return Array.from(byName.values())
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "app", "dashboard", "analytics", "kharita.html")
    const html = await readFile(filePath, "utf-8")
    const data = extractPaths(html)
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 })
  }
}
