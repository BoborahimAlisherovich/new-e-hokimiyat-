export const formatOrgId = (id: string) => {
  if (!id || id.length < 7) return id
  return `${id.slice(0, 3)}...${id.slice(-3)}`
}

export const getSectorLabel = (sector?: string) => {
  switch (sector) {
    case "IQTISODIYOT_BIZNES":
      return "Иқтисодиёт ва бизнес"
    case "KOMMUNAL_SOHA":
      return "Коммунал соҳа"
    case "SOGLIQNI_SAQLASH":
      return "Соғлиқни сақлаш"
    case "TA_LIM":
      return "Таълим"
    case "MADANIYAT_SPORT":
      return "Маданият ва спорт"
    default:
      return "—"
  }
}
