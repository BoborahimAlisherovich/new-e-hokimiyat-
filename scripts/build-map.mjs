#!/usr/bin/env node
/**
 * build-map.mjs — Xatirchi tumani qishloqlari xaritasi uchun geometriya quvuri
 * ============================================================================
 *
 * NIMA UCHUN BU SKRIPT BOR
 * ------------------------
 * Ilgari xarita brauzerda `/api/hatirchi-map` orqali yuklanardi: server har
 * GET'da 1.35 MiB saqlangan HTML sahifani o'qib, regex bilan 70 ta <path>
 * tagini ajratib, 1.21 MiB JSON qaytarardi. Klientda 69 ta <path> har biri
 * ~18 KB `d` ma'lumot bilan chizilardi (jami 32 630 ta nuqta) — brauzer
 * muzlab qolardi.
 *
 * Endi geometriya BIR MARTA, shu skript bilan, build vaqtida tayyorlanadi va
 * `public/geo/` ga statik fayl sifatida tushadi (next.config.mjs unga
 * `Cache-Control: immutable` beradi). Klient hech qanday proyeksiya yoki
 * geometriya hisobini bajarmaydi — faqat tayyor `d` satrlarini chizadi.
 *
 * QANDAY ISHLAYDI
 * ---------------
 *   1. Manba: `_to_delete/khatirchi.json` — online-mahalla.uz API konverti
 *      { error, message, timestamp, status, path, data[71], response }.
 *      Har `data[i]` = { value, text, int01, polygon, _level } va `polygon`
 *      GeoJSON geometriyasi SATR (string) ko'rinishida.
 *      `value` — qishloqning barqaror kodi (masalan 1209027); JOIN KALITI
 *      shu, nomdan yasalgan slug EMAS (nom tillar bo'yicha o'zgaradi).
 *      data[0] — tumanning o'zi (value=null, polygon=null) — tashlanadi.
 *   2. Normalizatsiya: 68 ta Polygon, 1 ta MultiPolygon va 1 ta "yalang'och"
 *      massiv ([{type:'Polygon',...}]) to'g'ri Feature'larga aylantiriladi.
 *   3. Soddalashtirish (mapshaper):
 *        -simplify visvalingam 10% keep-shapes   (mayda qishloq yo'qolmaydi)
 *        -clean                                  (o'z-o'ziga kesishish, teshik)
 *        -o precision=0.00001                    (5 kasr ~ 1 m aniqlik)
 *      TopoJSON chiqariladi: 70 qishloq bitta tumanni to'liq qoplaydi, ya'ni
 *      har bir ichki chegara hozir IKKI marta saqlanadi. TopoJSON umumiy
 *      yoylarni (arcs) bir marta saqlab, shu dublikatni olib tashlaydi.
 *   4. Proyeksiya: d3-geo `geoMercator().fitSize()` qat'iy viewBox'ga
 *      moslanadi, `d` satrlari va yorliq nuqtalari (polylabel — eng katta
 *      ko'pburchakning "erishib bo'lmaydigan qutbi") shu yerda hisoblanadi.
 *   5. Chiqish (ikkisi ham `public/geo/`):
 *        xatirchi-villages.topo.json  — TopoJSON (qayta ishlov uchun zaxira)
 *        xatirchi-villages.paths.json — klient o'qiydigan fayl:
 *          { viewBox, villages: [{ code, name_latn, name_cyrl, d, cx, cy }] }
 *
 * ISHLATISH
 * ---------
 *   npm i -D mapshaper d3-geo topojson-client polylabel
 *   node scripts/build-map.mjs [manba.json]
 *
 * Diqqat: `mapshaper` va `d3-geo` faqat SHU skript uchun kerak — ilova
 * bundle'iga tushmaydi. Skript kamdan-kam (chegaralar o'zgarganda) ishlatiladi,
 * shuning uchun paketlar devDependency sifatida vaqtincha o'rnatilsa ham bo'ladi.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mapshaper from 'mapshaper'
import { geoMercator, geoPath } from 'd3-geo'
import { feature as topoFeature } from 'topojson-client'
import polylabel from 'polylabel'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const SRC = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, '_to_delete', 'khatirchi.json')
const OUT_DIR = path.join(ROOT, 'public', 'geo')
const OUT_TOPO = path.join(OUT_DIR, 'xatirchi-villages.topo.json')
const OUT_PATHS = path.join(OUT_DIR, 'xatirchi-villages.paths.json')

/** Soddalashtirish darajasi — 10% nuqta qoladi, shakllar saqlanadi. */
const SIMPLIFY = 'visvalingam 10% keep-shapes'
/** 5 kasr ≈ 1 m; WGS84 uchun bundan ortig'i shovqin (manbada 15 kasr bor). */
const PRECISION = 0.00001
/** Qat'iy viewBox: klient shuni ishlatadi, proyeksiya hisobi klientda yo'q. */
const FIT_W = 1000
const FIT_H = 700
/** viewBox atrofidagi bo'sh joy (chegara chizig'i kesilmasligi uchun). */
const PAD = 6
/** `d` satridagi kasr xonalari — 1000 birlik keng viewBox uchun 1 yetarli. */
const D_DECIMALS = 1

// ---------------------------------------------------------------- translit
// Kirill → Lotin. lib/translit.ts dagi jadval bilan bir xil bo'lishi shart:
// nomlar shu skriptda bir marta o'giriladi, klient qayta o'girmaydi.
const CYR_TO_LAT = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'j', з:'z', и:'i',
  й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t',
  у:'u', ф:'f', х:'x', ц:'ts', ч:'ch', ш:'sh', щ:'sh', ъ:"'", ы:'i', ь:'',
  э:'e', ю:'yu', я:'ya', ў:"o'", қ:'q', ғ:"g'", ҳ:'h',
  А:'A', Б:'B', В:'V', Г:'G', Д:'D', Е:'E', Ё:'Yo', Ж:'J', З:'Z', И:'I',
  Й:'Y', К:'K', Л:'L', М:'M', Н:'N', О:'O', П:'P', Р:'R', С:'S', Т:'T',
  У:'U', Ф:'F', Х:'X', Ц:'Ts', Ч:'Ch', Ш:'Sh', Щ:'Sh', Ъ:"'", Ы:'I', Ь:'',
  Э:'E', Ю:'Yu', Я:'Ya', Ў:"O'", Қ:'Q', Ғ:"G'", Ҳ:'H',
}

function toLatin(text) {
  return Array.from(text).map((ch) => CYR_TO_LAT[ch] ?? ch).join('')
}

function tidyName(text) {
  const cleaned = text.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

// ------------------------------------------------------------- normalizatsiya
/**
 * `polygon` satrini to'g'ri GeoJSON geometriyasiga aylantiradi.
 * Manbada uchraydigan uch shakl: Polygon, MultiPolygon va geometriya
 * obyektlari solingan yalang'och massiv.
 */
function parseGeometry(raw) {
  let g = JSON.parse(raw)

  if (Array.isArray(g)) {
    const geoms = g.filter((item) => item && typeof item === 'object' && item.type)
    if (geoms.length === 1) g = geoms[0]
    else if (geoms.length > 1) {
      // Bir nechta bo'lak — MultiPolygon'ga yig'iladi.
      const polys = []
      for (const geom of geoms) {
        if (geom.type === 'Polygon') polys.push(geom.coordinates)
        else if (geom.type === 'MultiPolygon') polys.push(...geom.coordinates)
      }
      g = { type: 'MultiPolygon', coordinates: polys }
    } else {
      // Haqiqatan yalang'och koordinata massivi.
      g = { type: 'Polygon', coordinates: g }
    }
  }

  if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') {
    throw new Error(`kutilmagan geometriya turi: ${g.type}`)
  }
  return g
}

/**
 * d3-geo sferik ko'pburchaklar bilan ishlaydi va TASHQI halqa SOAT YO'NALISHIDA
 * (shoelace maydoni manfiy) bo'lishini kutadi. Manba ma'lumoti teskari
 * yo'nalishda — bunda d3 ko'pburchakni "butun sfera minus shu joy" deb tushunadi
 * va `fitSize` butun dunyoni viewBox'ga siqadi (natijada hamma yo'l bitta
 * nuqtaga aylanadi). Shuning uchun proyeksiyadan oldin yo'nalish tuzatiladi.
 */
function ringArea(ring) {
  let sum = 0
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % n]
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

function rewindPolygon(rings) {
  return rings.map((ring, index) => {
    const area = ringArea(ring)
    // Tashqi halqa (index 0) manfiy, teshiklar musbat bo'lishi kerak.
    const wantNegative = index === 0
    if ((area < 0) === wantNegative) return ring
    return ring.slice().reverse()
  })
}

function rewindGeometry(geometry) {
  if (geometry.type === 'Polygon') {
    return { ...geometry, coordinates: rewindPolygon(geometry.coordinates) }
  }
  return { ...geometry, coordinates: geometry.coordinates.map(rewindPolygon) }
}

function countVertices(geometry) {
  const rings = geometry.type === 'Polygon'
    ? geometry.coordinates
    : geometry.coordinates.flat()
  return rings.reduce((sum, ring) => sum + ring.length, 0)
}

async function buildSourceCollection() {
  const envelope = JSON.parse(await readFile(SRC, 'utf8'))
  const rows = Array.isArray(envelope?.data) ? envelope.data : []

  const features = []
  let vertices = 0
  const skipped = []

  for (const row of rows) {
    // Tumanning o'zi (value=null, polygon=null) — xaritaga kirmaydi.
    if (row?.value == null || !row?.polygon) {
      skipped.push(row?.text ?? '(nomsiz)')
      continue
    }
    const geometry = parseGeometry(row.polygon)
    vertices += countVertices(geometry)
    const cyrl = tidyName(String(row.text ?? ''))
    features.push({
      type: 'Feature',
      properties: {
        code: String(row.value),
        name_latn: tidyName(toLatin(String(row.text ?? ''))),
        name_cyrl: cyrl,
      },
      geometry,
    })
  }

  return {
    fc: { type: 'FeatureCollection', features },
    vertices,
    skipped,
  }
}

// ------------------------------------------------------------------ `d` satri
/**
 * d3-geo uchun kontekst: koordinatalarni yaxlitlab, to'g'ridan-to'g'ri
 * SVG `d` satrini yig'adi. Standart geoPath 15 kasrli float chiqaradi —
 * bu faylni bir necha barobar kattalashtiradi.
 */
function roundingContext(decimals) {
  const out = []
  const r = (n) => {
    const v = Number(n.toFixed(decimals))
    return Object.is(v, -0) ? 0 : v
  }
  return {
    toString: () => out.join(''),
    moveTo(x, y) { out.push(`M${r(x)},${r(y)}`) },
    lineTo(x, y) { out.push(`L${r(x)},${r(y)}`) },
    closePath() { out.push('Z') },
    arc() { /* nuqtalar chizilmaydi */ },
  }
}

/** Proyeksiya qilingan eng katta halqa uchun yorliq nuqtasi. */
function labelAnchor(geometry, projection) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  let best = null
  let bestLen = -1
  for (const poly of polys) {
    const outer = poly[0]
    if (outer && outer.length > bestLen) { bestLen = outer.length; best = poly }
  }
  if (!best) return null
  const projected = best.map((ring) =>
    ring.map((pt) => projection(pt)).filter((pt) => pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1])),
  ).filter((ring) => ring.length > 3)
  if (!projected.length) return null
  const [cx, cy] = polylabel(projected, 0.5)
  return [Number(cx.toFixed(1)), Number(cy.toFixed(1))]
}

// ------------------------------------------------------------------------ main
async function main() {
  const { fc, vertices: srcVertices, skipped } = await buildSourceCollection()
  console.log(`manba: ${SRC}`)
  console.log(`  qishloq: ${fc.features.length}, nuqta: ${srcVertices}`)
  if (skipped.length) console.log(`  tashlab ketildi: ${skipped.join(', ')}`)

  // --- mapshaper: soddalashtirish + tozalash + TopoJSON
  const input = { 'source.geojson': JSON.stringify(fc) }
  const cmd = [
    '-i source.geojson',
    `-simplify ${SIMPLIFY}`,
    '-clean',
    `-o out.topo.json format=topojson precision=${PRECISION} id-field=code`,
    `-o out.geojson format=geojson precision=${PRECISION}`,
  ].join(' ')

  const output = await mapshaper.applyCommands(cmd, input)
  const topo = output['out.topo.json']
  const simplifiedRaw = JSON.parse(new TextDecoder().decode(output['out.geojson']))
  const simplified = {
    type: 'FeatureCollection',
    features: simplifiedRaw.features.map((f) => ({ ...f, geometry: rewindGeometry(f.geometry) })),
  }

  const simpVertices = simplified.features.reduce((sum, f) => sum + countVertices(f.geometry), 0)
  console.log(`soddalashtirilgandan keyin: nuqta ${simpVertices} (${((simpVertices / srcVertices) * 100).toFixed(1)}%)`)

  // --- proyeksiya + `d` satrlari
  const projection = geoMercator().fitSize([FIT_W, FIT_H], simplified)
  const bounds = geoPath(projection).bounds(simplified)
  const [[x0, y0], [x1, y1]] = bounds
  const width = Math.ceil(x1 - x0 + PAD * 2)
  const height = Math.ceil(y1 - y0 + PAD * 2)
  // Proyeksiyani surib, viewBox'ni "0 0 W H" ga keltiramiz — klientda
  // manfiy koordinatalar bilan ishlash shart bo'lmaydi.
  const [tx, ty] = projection.translate()
  projection.translate([tx - x0 + PAD, ty - y0 + PAD])

  const villages = []
  for (const f of simplified.features) {
    const ctx = roundingContext(D_DECIMALS)
    geoPath(projection, ctx)(f)
    const d = ctx.toString()
    if (!d) { console.warn(`  ogohlantirish: ${f.properties.code} uchun bo'sh yo'l`); continue }
    const anchor = labelAnchor(f.geometry, projection)
    villages.push({
      code: f.properties.code,
      name_latn: f.properties.name_latn,
      name_cyrl: f.properties.name_cyrl,
      d,
      cx: anchor ? anchor[0] : null,
      cy: anchor ? anchor[1] : null,
    })
  }
  villages.sort((a, b) => a.name_latn.localeCompare(b.name_latn, 'uz'))

  const payload = {
    // Qat'iy viewBox — klientdagi <svg> aynan shuni ishlatadi.
    viewBox: `0 0 ${width} ${height}`,
    generated_from: path.basename(SRC),
    simplify: SIMPLIFY,
    villages,
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_TOPO, topo)
  await writeFile(OUT_PATHS, JSON.stringify(payload))

  const dChars = villages.reduce((s, v) => s + v.d.length, 0)
  console.log(`yozildi ${OUT_TOPO} (${topo.length} bayt)`)
  console.log(`yozildi ${OUT_PATHS} (${Buffer.byteLength(JSON.stringify(payload))} bayt)`)
  console.log(`  viewBox ${payload.viewBox}, qishloq ${villages.length}, d jami ${dChars} belgi`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
