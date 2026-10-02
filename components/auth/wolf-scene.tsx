"use client"

/* =============================================================================
   BO'RI VA HUMO — KIRISH SAHIFASI UCHUN THREE.JS SAHNA (v2)
   -----------------------------------------------------------------------------
   Tashqi 3D model YO'Q: hamma narsa primitivlardan yig'iladi (sfera, kapsula,
   konus, pat shakli). Sabab — server ichki tarmoqda bo'lishi mumkin, GLB
   yuklash uchun CDN yo'q; model litsenziyasi muammosi ham chiqmaydi.
   Agar hokimlik o'z 3D modelini bersa (`public/models/bori.glb`), shu fayl
   GLTFLoader bilan almashtiriladi — API (look/mode) o'zgarmaydi.

   v2 da nima o'zgardi
   • Bo'ri — «pufak» emas, sportchi: kulrang mo'yna, oq tumshuq va ko'krak,
     uzun tumshuq, qora ko'z niqobi, sariq-qo'ng'ir ko'zlar, qosh, yonoq
     tuklari, tik quloqlar, pahmoq dum. Oq futbolka (ko'k bezak, 7-raqam),
     ko'k shim, oq paypoq, butsa, oyog'i ostida to'p.
   • Humo — oq kaptar emas: ko'k-binafsha tovlanuvchi (iridescent) patlar,
     keng yoyilgan qanotlar uch qator patdan (birlamchi, ikkilamchi, qoplama),
     uzun dum patlari, boshida toj. Yumshoq ko'k nur bilan.

   Xatti-harakat (props ref'da — re-render yo'q):
     look  -1..1  login maydonidagi kursor; bo'ri o'sha tomonga qaraydi
     mode  idle | watch | cover | peek
           cover — parol yozilmoqda: ikki panja ko'zda
           peek  — «parolni ko'rsat»: bitta panja ozgina ochiladi

   Ishlash: pixelRatio ≤ 2, soya yo'q, tab yashiringanda to'xtaydi,
   unmount'da hamma narsa dispose. prefers-reduced-motion — statik poza.
============================================================================= */

import { useEffect, useRef } from "react"
import * as THREE from "three"

export type WolfMode = "idle" | "watch" | "cover" | "peek"

export interface WolfSceneProps {
  look: number
  mode: WolfMode
  className?: string
}

/* ------------------------------------------------------------------ RANGLAR */
const C = {
  furGrey: 0x9aa3b4,
  furDark: 0x5b6474,
  furLight: 0xf1f3f8,
  nose: 0x1c2231,
  iris: 0xe3a53c,
  pupil: 0x141a26,
  eyeWhite: 0xffffff,
  earInner: 0xe9d3d3,
  shirt: 0xffffff,
  blue: 0x1e4fd8,
  blueDark: 0x143a9e,
  green: 0x0f9d7a,
  boot: 0x1b2540,
  ball: 0xf7f8fb,
  humo: 0x6f9cff,
  humoDeep: 0x3b5bd9,
  humoPink: 0xd28bff,
  humoGold: 0xf0c060,
  ground: 0xe6ebf7,
} as const

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0, ...opts })
}

/** Cho'zilgan sfera — mo'yna bo'laklari uchun eng arzon primitiv */
function blob(
  r: number,
  m: THREE.Material,
  sx = 1,
  sy = 1,
  sz = 1,
  x = 0,
  y = 0,
  z = 0,
  seg = 20,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 6)), m)
  mesh.scale.set(sx, sy, sz)
  mesh.position.set(x, y, z)
  return mesh
}

/* --------------------------------------------------------------- TEKSTURALAR */

/** Futbolka: oq, ko'k yon chiziqlar, «O‘ZBEKISTON» va 7-raqam. Rasmiy gerb yo'q. */
function makeShirtTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null
  const c = document.createElement("canvas")
  c.width = 512
  c.height = 512
  const g = c.getContext("2d")
  if (!g) return null
  g.fillStyle = "#ffffff"
  g.fillRect(0, 0, 512, 512)
  /* Kapsula UV: old tomon x≈362 (empirik, smoke-testda o'lchangan) */
  const FRONT = 362
  for (const x of [FRONT - 128, FRONT + 128]) {
    g.fillStyle = "#1e4fd8"
    g.fillRect(x - 14, 0, 18, 512)
    g.fillStyle = "#0f9d7a"
    g.fillRect(x + 4, 0, 8, 512)
  }
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.fillStyle = "#1e4fd8"
  g.font = "700 24px Inter, system-ui, sans-serif"
  g.fillText("O‘ZBEKISTON", FRONT, 150)
  g.font = "800 128px Inter, system-ui, sans-serif"
  g.fillStyle = "#143a9e"
  g.fillText("7", FRONT, 262)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Futbol to'pi — oq fon, qora besh burchak o'rnida qora doiralar (yetarli). */
function makeBallTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 128
  const g = c.getContext("2d")
  if (!g) return null
  g.fillStyle = "#f7f8fb"
  g.fillRect(0, 0, 256, 128)
  g.fillStyle = "#1c2231"
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      const x = i * 42 + (j % 2) * 21 + 10
      const y = j * 42 + 22
      g.beginPath()
      g.arc(x, y, 11, 0, Math.PI * 2)
      g.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ------------------------------------------------------------------- BO'RI */
interface WolfRig {
  root: THREE.Group
  head: THREE.Group
  pupils: THREE.Mesh[]
  lids: THREE.Mesh[]
  browL: THREE.Mesh
  browR: THREE.Mesh
  armL: THREE.Group
  armR: THREE.Group
  tail: THREE.Group
  tailBones: THREE.Group[]
  earL: THREE.Group
  earR: THREE.Group
  torso: THREE.Group
}

function buildWolf(shirtTex: THREE.CanvasTexture | null, ballTex: THREE.CanvasTexture | null): WolfRig {
  const root = new THREE.Group()
  const grey = mat(C.furGrey)
  const dark = mat(C.furDark)
  const light = mat(C.furLight)
  const noseM = mat(C.nose, { roughness: 0.35 })

  /* ---- Oyoqlar: shim, son, paypoq, butsa ---- */
  const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.34, 24), mat(C.blue))
  shorts.position.y = 0.72
  root.add(shorts)
  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 6, 16), grey)
    thigh.position.set(side * 0.24, 0.5, side === 1 ? 0.08 : -0.02)
    thigh.rotation.x = side === 1 ? -0.25 : 0.1
    root.add(thigh)
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.26, 16), light)
    sock.position.set(side * 0.25, 0.24, side === 1 ? 0.16 : -0.04)
    root.add(sock)
    const sockTrim = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.025, 8, 20), mat(C.blue))
    sockTrim.position.set(side * 0.25, 0.36, side === 1 ? 0.16 : -0.04)
    sockTrim.rotation.x = Math.PI / 2
    root.add(sockTrim)
    const boot = blob(0.17, mat(C.boot, { roughness: 0.45 }), 1, 0.55, 1.55, side * 0.25, 0.08, side === 1 ? 0.28 : 0.06)
    root.add(boot)
  }

  /* ---- To'p — o'ng oyoq oldida ---- */
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 24, 16),
    new THREE.MeshStandardMaterial({ color: C.ball, map: ballTex ?? undefined, roughness: 0.55 }),
  )
  ball.position.set(0.62, 0.24, 0.62)
  ball.rotation.set(0.4, 0.8, 0.2)
  root.add(ball)

  /* ---- Tana + futbolka ---- */
  const torso = new THREE.Group()
  torso.position.y = 1.3
  root.add(torso)
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.62, 8, 24), grey)
  torso.add(chest)
  const shirt = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 0.5, 8, 32),
    new THREE.MeshStandardMaterial({ color: C.shirt, map: shirtTex ?? undefined, roughness: 0.92 }),
  )
  shirt.position.y = 0.03
  shirt.rotation.y = Math.PI
  torso.add(shirt)
  // Yoqa
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 8, 28), mat(C.blue))
  collar.position.y = 0.55
  collar.rotation.x = Math.PI / 2
  torso.add(collar)
  // Yenglar + yelka
  for (const side of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.26, 16), mat(C.shirt))
    sleeve.position.set(side * 0.55, 0.32, 0)
    sleeve.rotation.z = side * 0.5
    torso.add(sleeve)
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 24), mat(C.blue))
    trim.position.set(side * 0.61, 0.21, 0)
    trim.rotation.z = side * 0.5
    trim.rotation.x = Math.PI / 2
    torso.add(trim)
  }
  // Ko'krakdagi oq mo'yna — yoqa ustida ko'rinadi
  torso.add(blob(0.2, light, 1.3, 0.6, 0.8, 0, 0.62, 0.22))

  /* ---- Qo'llar (yelkada pivot) ---- */
  const makeArm = (side: number) => {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.6, 1.62, 0.1)
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 6, 14), grey)
    upper.position.y = -0.26
    pivot.add(upper)
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.36, 6, 14), grey)
    fore.position.set(0, -0.62, 0.02)
    pivot.add(fore)
    const paw = blob(0.17, light, 1, 0.8, 1.1, 0, -0.9, 0.04)
    pivot.add(paw)
    for (let i = -1; i <= 1; i++) {
      pivot.add(blob(0.04, noseM, 1, 1, 1, i * 0.065, -0.95, 0.14, 10))
    }
    root.add(pivot)
    return pivot
  }
  const armL = makeArm(-1)
  const armR = makeArm(1)

  /* ---- Bo'yin ---- */
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.3, 18), grey)
  neck.position.set(0, 2.0, 0.02)
  root.add(neck)
  // Bo'yin tuki (yoqa ustidagi pahmoq)
  root.add(blob(0.3, light, 1.25, 0.5, 1.0, 0, 1.95, 0.14, 18))

  /* ---- Bosh ---- */
  const head = new THREE.Group()
  head.position.set(0, 2.32, 0.04)
  root.add(head)

  head.add(blob(0.42, grey, 1, 0.9, 1.02)) // kalla
  head.add(blob(0.36, dark, 1.02, 0.7, 0.9, 0, 0.2, -0.08)) // orqa-ust qoraroq
  // Yonoq tuklari — tashqariga-pastga
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 10), light)
    cheek.position.set(side * 0.4, -0.2, 0.1)
    cheek.rotation.z = side * 1.05
    cheek.rotation.x = 0.35
    cheek.rotation.y = side * 0.2
    head.add(cheek)
  }
  // Tumshuq — uzun, oq; ustki qismi kulrang
  head.add(blob(0.2, light, 1.0, 0.72, 1.7, 0, -0.14, 0.42))
  head.add(blob(0.17, grey, 0.95, 0.5, 1.45, 0, -0.03, 0.42)) // tumshuq usti
  head.add(blob(0.13, light, 1.05, 0.5, 0.9, 0, -0.27, 0.5)) // pastki jag'
  const nose = blob(0.075, noseM, 1.1, 0.8, 0.9, 0, -0.05, 0.78, 14)
  head.add(nose)
  // Og'iz chizig'i
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 16, Math.PI), noseM)
  mouth.position.set(0, -0.2, 0.72)
  mouth.rotation.x = Math.PI
  head.add(mouth)

  // Ko'z niqobi (qora patch) + ko'zlar
  const pupils: THREE.Mesh[] = []
  const lids: THREE.Mesh[] = []
  const irisM = mat(C.iris, { roughness: 0.3 })
  const pupilM = mat(C.pupil, { roughness: 0.2 })
  for (const side of [-1, 1]) {
    head.add(blob(0.13, dark, 1.35, 0.9, 0.5, side * 0.2, 0.04, 0.33, 14))
    head.add(blob(0.085, mat(C.eyeWhite, { roughness: 0.25 }), 1, 1, 0.7, side * 0.19, 0.05, 0.37, 16))
    const iris = blob(0.05, irisM, 1, 1, 0.5, side * 0.19, 0.05, 0.425, 14)
    head.add(iris)
    const pupil = blob(0.026, pupilM, 1, 1, 0.5, side * 0.19, 0.05, 0.45, 10)
    head.add(pupil)
    pupils.push(iris, pupil)
    // Qovoq — yuqoridan tushadi (scale.y bilan)
    const lid = new THREE.Mesh(
      new THREE.SphereGeometry(0.092, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      grey,
    )
    lid.position.set(side * 0.19, 0.06, 0.365)
    lid.rotation.x = -0.35
    lid.scale.y = 0.001
    head.add(lid)
    lids.push(lid)
  }
  // Qoshlar — ifoda
  const browGeo = new THREE.BoxGeometry(0.16, 0.035, 0.05)
  const browL = new THREE.Mesh(browGeo, dark)
  browL.position.set(-0.2, 0.19, 0.38)
  browL.rotation.z = -0.25
  head.add(browL)
  const browR = new THREE.Mesh(browGeo, dark)
  browR.position.set(0.2, 0.19, 0.38)
  browR.rotation.z = 0.25
  head.add(browR)

  // Quloqlar — tik, uchi qora, ichi och
  const makeEar = (side: number) => {
    const g = new THREE.Group()
    g.position.set(side * 0.26, 0.36, -0.06)
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.46, 14), grey)
    outer.position.y = 0.2
    g.add(outer)
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 12), dark)
    tip.position.y = 0.36
    g.add(tip)
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 10), mat(C.earInner))
    inner.position.set(0, 0.16, 0.06)
    g.add(inner)
    g.rotation.z = side * -0.22
    g.rotation.x = -0.12
    head.add(g)
    return g
  }
  const earL = makeEar(-1)
  const earR = makeEar(1)

  /* ---- Dum — pahmoq, 4 bo'g'in ---- */
  const tail = new THREE.Group()
  tail.position.set(-0.1, 0.78, -0.42)
  root.add(tail)
  const tailBones: THREE.Group[] = []
  let parent: THREE.Object3D = tail
  const radii = [0.14, 0.17, 0.16, 0.11]
  const mats = [dark, grey, grey, light]
  for (let i = 0; i < 4; i++) {
    const bone = new THREE.Group()
    bone.position.set(0, i === 0 ? 0 : 0.22, i === 0 ? 0 : -0.16)
    const seg = blob(radii[i], mats[i], 1, 1.15, 1.25, 0, 0.1, -0.1)
    bone.add(seg)
    parent.add(bone)
    parent = bone
    tailBones.push(bone)
  }
  tail.rotation.x = 0.9

  return { root, head, pupils, lids, browL, browR, armL, armR, tail, tailBones, earL, earR, torso }
}

/* -------------------------------------------------------------------- HUMO */
interface HumoRig {
  root: THREE.Group
  wingL: THREE.Group
  wingR: THREE.Group
  wingTipL: THREE.Group
  wingTipR: THREE.Group
  tailPlumes: THREE.Mesh[]
  crest: THREE.Mesh[]
  light: THREE.PointLight
}

/** Pat shakli — asosi ingichka, o'rtasi keng, uchi yumaloq. +Y bo'ylab. */
function featherGeometry(len: number, w: number): THREE.ShapeGeometry {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.quadraticCurveTo(w * 0.9, len * 0.35, w * 0.55, len * 0.8)
  s.quadraticCurveTo(w * 0.25, len * 1.02, 0, len)
  s.quadraticCurveTo(-w * 0.25, len * 1.02, -w * 0.55, len * 0.8)
  s.quadraticCurveTo(-w * 0.9, len * 0.35, 0, 0)
  return new THREE.ShapeGeometry(s, 10)
}

function buildHumo(): HumoRig {
  const root = new THREE.Group()

  const plume = new THREE.MeshPhysicalMaterial({
    color: C.humo,
    metalness: 0.45,
    roughness: 0.28,
    iridescence: 1,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [120, 420],
    emissive: C.humoDeep,
    emissiveIntensity: 0.18,
    side: THREE.DoubleSide,
  })
  const plumeTip = new THREE.MeshPhysicalMaterial({
    color: C.humoPink,
    metalness: 0.4,
    roughness: 0.3,
    iridescence: 1,
    iridescenceIOR: 1.5,
    emissive: 0x7a3fd0,
    emissiveIntensity: 0.22,
    side: THREE.DoubleSide,
  })
  const bodyM = new THREE.MeshPhysicalMaterial({
    color: 0x8fb2ff,
    metalness: 0.35,
    roughness: 0.35,
    iridescence: 0.8,
    emissive: C.humoDeep,
    emissiveIntensity: 0.15,
  })
  const goldM = mat(C.humoGold, { roughness: 0.35, metalness: 0.5 })

  /* Tana, bo'yin, bosh, tumshuq */
  root.add(blob(0.2, bodyM, 1, 0.85, 1.6, 0, 0, 0, 22))
  root.add(blob(0.11, bodyM, 1, 1, 1.4, 0, 0.14, 0.3, 16)) // bo'yin
  root.add(blob(0.12, bodyM, 1, 1, 1.1, 0, 0.26, 0.48, 18)) // bosh
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.2, 10), goldM)
  beak.position.set(0, 0.24, 0.66)
  beak.rotation.x = Math.PI / 2
  root.add(beak)
  // Ko'zlar
  for (const side of [-1, 1]) root.add(blob(0.022, mat(0x111827, { roughness: 0.2 }), 1, 1, 1, side * 0.08, 0.3, 0.55, 8))

  /* Toj — 5 ta uzun pat yuqoriga-orqaga */
  const crest: THREE.Mesh[] = []
  for (let i = -2; i <= 2; i++) {
    const f = new THREE.Mesh(featherGeometry(0.42 - Math.abs(i) * 0.06, 0.045), i === 0 ? plumeTip : plume)
    f.position.set(i * 0.035, 0.34, 0.42)
    f.rotation.x = -0.5 - Math.abs(i) * 0.1
    f.rotation.z = i * 0.25
    root.add(f)
    crest.push(f)
  }

  /* Qanot: yelka pivot → qo'l suyagi → bilak pivot (uch) */
  const makeWing = (side: number) => {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.14, 0.08, 0.02)
    // Qo'l suyagi (kulrang-ko'k)
    const arm = blob(0.06, bodyM, 1, 1, 1, 0, 0, 0)
    arm.scale.set(7, 1, 1.2)
    arm.position.x = side * 0.4
    shoulder.add(arm)

    // Qoplama patlar (kichik, tanaga yaqin)
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(featherGeometry(0.34, 0.06), plume)
      f.position.set(side * (0.12 + i * 0.12), -0.02, -0.02)
      f.rotation.x = -Math.PI / 2 // XZ tekislikka yotadi, +Y → -Z (orqaga)
      f.rotation.z = side * (0.25 - i * 0.03)
      shoulder.add(f)
    }
    // Ikkilamchi patlar
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Mesh(featherGeometry(0.62 - i * 0.02, 0.075), plume)
      f.position.set(side * (0.1 + i * 0.115), -0.03, -0.06)
      f.rotation.x = -Math.PI / 2
      f.rotation.z = side * (0.55 - i * 0.04)
      shoulder.add(f)
    }

    // Bilak — birlamchi patlar shu yerdan yelpig'ich bo'lib chiqadi
    const wrist = new THREE.Group()
    wrist.position.set(side * 0.8, 0, 0)
    shoulder.add(wrist)
    for (let i = 0; i < 9; i++) {
      const t = i / 8
      const len = lerp(0.9, 1.25, Math.sin(t * Math.PI * 0.75))
      const f = new THREE.Mesh(featherGeometry(len, 0.07), i >= 6 ? plumeTip : plume)
      // Yelpig'ich: tanadan tashqariga (yon) → orqaga
      f.rotation.x = -Math.PI / 2
      f.rotation.z = side * lerp(1.45, 0.25, t) // 1.45 ≈ yon tomonga, 0.25 ≈ orqaga
      f.position.set(side * i * 0.02, -0.01 - i * 0.004, 0)
      wrist.add(f)
    }
    root.add(shoulder)
    return { shoulder, wrist }
  }
  const L = makeWing(-1)
  const R = makeWing(1)

  /* Dum — 5 uzun pat, orqaga-pastga */
  const tailPlumes: THREE.Mesh[] = []
  for (let i = -2; i <= 2; i++) {
    const f = new THREE.Mesh(featherGeometry(1.35 - Math.abs(i) * 0.18, 0.075), Math.abs(i) === 2 ? plumeTip : plume)
    f.position.set(i * 0.045, -0.02, -0.28)
    f.rotation.x = Math.PI / 2 + 0.55 // +Y → orqaga-pastga
    f.rotation.z = i * 0.16
    root.add(f)
    tailPlumes.push(f)
  }

  /* Yumshoq ko'k nur — bo'ri va yer ustida tovlanadi */
  const light = new THREE.PointLight(0x7aa6ff, 8, 7, 1.6)
  light.position.set(0, -0.2, 0)
  root.add(light)

  return { root, wingL: L.shoulder, wingR: R.shoulder, wingTipL: L.wrist, wingTipR: R.wrist, tailPlumes, crest, light }
}

/* ============================================================== KOMPONENT */
export default function WolfScene({ look, mode, className }: WolfSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const stateRef = useRef({ look, mode })
  stateRef.current.look = clamp(look, -1, 1)
  stateRef.current.mode = mode

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    host.appendChild(renderer.domElement)
    Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" })

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50)
    camera.position.set(0.3, 2.0, 7.6)
    camera.lookAt(0, 1.9, 0)

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c4dd, 1.0))
    const key = new THREE.DirectionalLight(0xffffff, 1.9)
    key.position.set(3, 6, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x9db8ff, 0.9)
    rim.position.set(-4, 3, -3)
    scene.add(rim)

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 48),
      new THREE.MeshBasicMaterial({ color: C.ground, transparent: true, opacity: 0.9 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0.01
    scene.add(ground)

    const shirtTex = makeShirtTexture()
    const ballTex = makeBallTexture()
    const wolf = buildWolf(shirtTex, ballTex)
    wolf.root.rotation.y = -0.12 // ozgina yon — sportchi turishi
    scene.add(wolf.root)

    const humo = buildHumo()
    humo.root.position.set(0, 3.7, -0.9)
    scene.add(humo.root)

    const resize = () => {
      const w = host.clientWidth || 1
      const h = host.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.position.z = w / h < 0.9 ? 9.4 : 7.6
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    let raf = 0
    let running = true
    const clock = new THREE.Clock()
    const s = { headYaw: 0, headPitch: 0, pupilX: 0, armL: 0, armR: 0, lid: 0, brow: 0 }

    const targets = () => {
      const { look, mode } = stateRef.current
      const watching = mode === "watch"
      const covering = mode === "cover" || mode === "peek"
      return {
        headYaw: watching ? look * 0.45 : 0,
        headPitch: watching ? 0.16 : covering ? 0.1 : 0,
        pupilX: watching ? look * 0.035 : 0,
        armL: covering ? 1 : 0,
        armR: mode === "peek" ? 0.5 : covering ? 1 : 0,
        lid: covering ? 1.0 : watching ? 0.1 : 0.05, // cover — qovoq to'liq yopiladi (panja ozgina qiyshaysa ham ko'z ko'rinmaydi)
        brow: watching ? 1 : 0, // qosh ko'tariladi — diqqat
      }
    }

    const applyArm = (arm: THREE.Group, side: number, v: number) => {
      /* Qo'l deyarli tik yuqoriga (−170°), panja ko'z balandligida (y≈2.4),
         ozgina ichkariga — ikki panja ikki ko'zni yopadi. Qiymatlar
         smoke-render bilan tanlangan. */
      arm.rotation.x = lerp(0.1, -2.98, v)
      arm.rotation.z = lerp(side * 0.1, side * -0.52, v)
      arm.rotation.y = 0
      arm.position.z = lerp(0.1, 0.34, v)
      arm.position.x = lerp(side * 0.6, side * 0.5, v)
      arm.position.y = lerp(1.62, 1.8, v)
    }

    const frame = () => {
      if (!running) return
      const t = clock.getElapsedTime()
      const tg = targets()
      const k = reduce ? 1 : 0.1

      s.headYaw = lerp(s.headYaw, tg.headYaw, k)
      s.headPitch = lerp(s.headPitch, tg.headPitch, k)
      s.pupilX = lerp(s.pupilX, tg.pupilX, k * 1.6)
      s.armL = lerp(s.armL, tg.armL, k * 0.9)
      s.armR = lerp(s.armR, tg.armR, k * 0.9)
      s.lid = lerp(s.lid, tg.lid, k)
      s.brow = lerp(s.brow, tg.brow, k)

      const breathe = reduce ? 0 : Math.sin(t * 1.5) * 0.015
      wolf.torso.scale.set(1 + breathe, 1 - breathe * 0.5, 1 + breathe)
      wolf.root.position.y = reduce ? 0 : Math.sin(t * 1.5) * 0.01

      wolf.head.rotation.y = s.headYaw + (reduce ? 0 : Math.sin(t * 0.7) * 0.02)
      wolf.head.rotation.x = s.headPitch + (reduce ? 0 : Math.sin(t * 1.5) * 0.01)
      wolf.head.rotation.z = -s.headYaw * 0.18

      for (let i = 0; i < wolf.pupils.length; i++) {
        const side = i < 2 ? -1 : 1
        wolf.pupils[i].position.x = side * 0.19 + s.pupilX
      }
      for (const lid of wolf.lids) lid.scale.y = Math.max(0.001, s.lid)
      wolf.browL.position.y = 0.19 + s.brow * 0.03
      wolf.browR.position.y = 0.19 + s.brow * 0.03
      wolf.browL.rotation.z = -0.25 + s.brow * 0.15
      wolf.browR.rotation.z = 0.25 - s.brow * 0.15

      applyArm(wolf.armL, -1, s.armL)
      applyArm(wolf.armR, 1, s.armR)

      // Dum — bo'g'inlar ketma-ket (to'lqin)
      const wag = stateRef.current.mode === "watch" ? 5.5 : 2.0
      wolf.tailBones.forEach((b, i) => {
        b.rotation.y = reduce ? 0 : Math.sin(t * wag - i * 0.6) * (0.22 + i * 0.05)
      })
      const twitch = reduce ? 0 : Math.max(0, Math.sin(t * 3.1)) ** 8 * 0.18
      wolf.earL.rotation.z = -(-0.22) + twitch // chap quloq (side=-1 → +0.22)
      wolf.earR.rotation.z = -0.22 - twitch * 0.6

      /* Humo — sekin sakkizlik, keng qanot qoqish, dum va toj tebranishi */
      if (!reduce) {
        const u = t * 0.35
        humo.root.position.x = Math.sin(u) * 1.5
        humo.root.position.y = 3.7 + Math.sin(u * 2) * 0.18
        humo.root.position.z = -0.9 + Math.cos(u) * 0.5
        const dx = Math.cos(u) * 1.5
        const dz = -Math.sin(u) * 0.5
        humo.root.rotation.y = Math.atan2(dx, dz)
        humo.root.rotation.z = -Math.cos(u) * 0.22
        humo.root.rotation.x = 0.5 // ko'krak yuqoriga — kamera pastdan qanot ostini ko'radi
        const flap = Math.sin(t * 4.2)
        // Yelka: -0.1 (yoyilgan) … 0.9 (yuqorida) — V shakl
        const shoulderAngle = 0.35 + flap * 0.55
        humo.wingL.rotation.z = -shoulderAngle
        humo.wingR.rotation.z = shoulderAngle
        // Bilak biroz kechikadi — patlar «eshadi»
        const tipLag = Math.sin(t * 4.2 - 0.7) * 0.35
        humo.wingTipL.rotation.z = -tipLag
        humo.wingTipR.rotation.z = tipLag
        humo.tailPlumes.forEach((p, i) => {
          p.rotation.x = Math.PI / 2 + 0.55 + Math.sin(t * 1.8 + i * 0.4) * 0.07
        })
        humo.crest.forEach((c, i) => {
          c.rotation.x = -0.5 - Math.abs(i - 2) * 0.1 + Math.sin(t * 2.5 + i) * 0.06
        })
        humo.light.intensity = 7 + Math.sin(t * 2) * 1.5
      } else {
        humo.wingL.rotation.z = -0.6
        humo.wingR.rotation.z = 0.6
      }

      renderer.render(scene, camera)
      if (!reduce) raf = requestAnimationFrame(frame)
    }

    let reduceTimer = 0
    if (reduce) {
      frame()
      reduceTimer = window.setInterval(frame, 250)
    } else {
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        clock.getDelta()
        if (!reduce) raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      if (reduceTimer) window.clearInterval(reduceTimer)
      document.removeEventListener("visibilitychange", onVisibility)
      ro.disconnect()
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
        for (const mm of mats) {
          ;(mm as THREE.MeshStandardMaterial).map?.dispose()
          mm.dispose()
        }
      })
      shirtTex?.dispose()
      ballTex?.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
      role="img"
      aria-label="Kulrang bo‘ri O‘zbekiston futbol formasida; tepada ko‘k-binafsha Humo qushi qanot qoqib uchmoqda"
    />
  )
}
