export const maskPnfl = (pnfl: string): string => {
  if (!pnfl || pnfl.length !== 14) return pnfl
  return `${pnfl.slice(0, 3)} ${pnfl.slice(3, 6)} ${pnfl.slice(6, 9)} ${pnfl.slice(9, 13)} ${pnfl.slice(13, 14)}`
}

export const roleCabinet = (role: string): string => {
  const cabinets: Record<string, string> = {
    HOKIM: "/dashboard",
    HOKIMLIK_MASUL: "/dashboard",
    TASHKILOT_RAHBAR: "/dashboard",
    TASHKILOT_RAHBARI: "/dashboard",
    TASHKILOT_MASUL: "/dashboard",
  }
  return cabinets[role] || "/dashboard"
}
