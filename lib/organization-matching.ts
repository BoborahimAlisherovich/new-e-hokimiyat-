type OrgLike = {
  id: string | number
  name?: string | null
  short_name?: string | null
  is_active?: boolean | null
}

const LEGAL_FORMS = [
  "mchj",
  "aj",
  "ooo",
  "llc",
  "inc",
  "ltd",
  "davlat",
  "unitar",
  "korxona",
  "muassasa",
  "tashkilot",
]

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’'`ʻ]/g, "'")
    .replace(/[^a-z0-9\u0400-\u04ff\u0100-\u017f\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stripLegalForms(input: string): string {
  const tokens = normalizeText(input).split(" ").filter(Boolean)
  const filtered = tokens.filter((t) => !LEGAL_FORMS.includes(t))
  return filtered.join(" ").trim()
}

function tokenSet(input: string): Set<string> {
  return new Set(stripLegalForms(input).split(" ").filter((t) => t.length > 1))
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const v of a) if (b.has(v)) intersection += 1
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

function scoreMatch(query: string, org: OrgLike): number {
  const rawQuery = stripLegalForms(query)
  if (!rawQuery) return 0

  const orgName = org.name || ""
  const orgShort = org.short_name || ""
  const orgCombined = `${orgName} ${orgShort}`.trim()

  const q = normalizeText(rawQuery)
  const o = normalizeText(orgCombined)

  if (!q || !o) return 0
  if (q === o) return 100

  const minLen = Math.min(q.length, o.length)
  const isSubstring = o.includes(q) || q.includes(o)
  if (isSubstring) {
    const ratio = minLen / Math.max(q.length, o.length)
    return 80 + Math.round(ratio * 15)
  }

  const qTokens = tokenSet(q)
  const oTokens = tokenSet(o)
  const jac = jaccard(qTokens, oTokens)
  if (jac > 0) return 35 + Math.round(jac * 45)

  return 0
}

export function resolveOrganizationIdsByNames(
  organizationNames: Array<string | null | undefined> | null | undefined,
  organizations: OrgLike[],
): string[] {
  const names = (organizationNames ?? []).map((n) => (n ?? "").trim()).filter(Boolean)
  if (names.length === 0) return []

  const activeOrgs = organizations.filter((o) => (o.is_active === undefined ? true : Boolean(o.is_active)))
  const resolved: string[] = []

  for (const name of names) {
    const normalized = stripLegalForms(name)
    const isVeryShort = normalizeText(normalized).replace(/\s/g, "").length < 4

    let best: { id: string; score: number } | null = null
    for (const org of activeOrgs) {
      const s = scoreMatch(name, org)
      if (!best || s > best.score) best = { id: String(org.id), score: s }
    }

    const threshold = isVeryShort ? 90 : 45
    if (best && best.score >= threshold) {
      resolved.push(best.id)
    }
  }

  return Array.from(new Set(resolved))
}

