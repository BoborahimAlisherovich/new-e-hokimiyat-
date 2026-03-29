"use client";

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function shouldReduceMotionOrEffects(): boolean {
  if (typeof window === "undefined") return true;

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReducedMotion) return true;

  // Mobile: animations + backdrop effects tend to be the main source of jank.
  if (window.matchMedia?.("(max-width: 767px)")?.matches) return true;

  const connection: any = (navigator as any)?.connection;
  if (connection?.saveData) return true;
  const effectiveType = String(connection?.effectiveType || "").toLowerCase();
  if (effectiveType.includes("2g") || effectiveType.includes("slow-2g")) return true;

  const deviceMemory = (navigator as any)?.deviceMemory;
  if (typeof deviceMemory === "number" && deviceMemory > 0 && deviceMemory <= 4) return true;

  return false;
}

/**
 * GSAP scroll-triggered fade-in animation
 */
export function useGSAPFadeIn(options?: {
  y?: number;
  x?: number;
  duration?: number;
  delay?: number;
  stagger?: number;
  trigger?: string;
  start?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduceMotionOrEffects()) return;

    const {
      y = 40,
      x = 0,
      duration = 0.8,
      delay = 0,
      stagger = 0.1,
      start = "top 85%",
      once = true,
    } = options || {};

    const children = ref.current.children;
    const targets = children.length > 1 ? Array.from(children) : ref.current;

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        y,
        x,
        opacity: 0,
        duration,
        delay,
        stagger: children.length > 1 ? stagger : 0,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start,
          toggleActions: once
            ? "play none none none"
            : "play none none reverse",
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [options]);

  return ref;
}

/**
 * Professional page entrance with staggered sections & smooth content reveal.
 * Applies to an entire page container with `data-gsap-section` children.
 * Also animates cards (`data-gsap-card`) within each section.
 */
export function useGSAPDashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (shouldReduceMotionOrEffects()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      // 1. Fade in the entire container
      tl.from(containerRef.current, {
        opacity: 0,
        duration: 0.35,
      });

      // 2. Stagger sections
      const sections = containerRef.current!.querySelectorAll("[data-gsap-section]");
      if (sections.length > 0) {
        tl.from(
          sections,
          {
            opacity: 0,
            y: 24,
            duration: 0.55,
            stagger: 0.1,
          },
          "-=0.15"
        );
      }

      // 3. Stagger individual cards within sections
      const cards = containerRef.current!.querySelectorAll("[data-gsap-card]");
      if (cards.length > 0) {
        tl.from(
          cards,
          {
            opacity: 0,
            y: 16,
            scale: 0.97,
            duration: 0.45,
            stagger: 0.06,
            ease: "back.out(1.4)",
          },
          "-=0.3"
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return containerRef;
}

/**
 * Smooth loading skeleton pulse (call once, toggles on `loading` change)
 */
export function useGSAPLoadingReveal(loading: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduceMotionOrEffects()) return;

    if (!loading) {
      const ctx = gsap.context(() => {
        gsap.from(ref.current!.children, {
          opacity: 0,
          y: 20,
          duration: 0.5,
          stagger: 0.08,
          ease: "power3.out",
        });
      }, ref);
      return () => ctx.revert();
    }
  }, [loading]);

  return ref;
}

/**
 * GSAP text reveal animation (character by character or word by word)
 */
export function useGSAPTextReveal(options?: {
  type?: "chars" | "words";
  duration?: number;
  stagger?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduceMotionOrEffects()) return;

    const { duration = 0.6, stagger = 0.03, delay = 0, type = "words" } = options || {};

    const text = ref.current.textContent || "";
    const units =
      type === "chars" ? text.split("") : text.split(" ");

    ref.current.innerHTML = units
      .map(
        (unit) =>
          `<span style="display:inline-block;overflow:hidden"><span style="display:inline-block">${
            type === "words" ? unit + "&nbsp;" : unit
          }</span></span>`
      )
      .join("");

    const innerSpans = ref.current.querySelectorAll(
      "span > span"
    );

    const ctx = gsap.context(() => {
      gsap.from(innerSpans, {
        y: "100%",
        opacity: 0,
        duration,
        stagger,
        delay,
        ease: "power4.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [options]);

  return ref;
}

/**
 * GSAP counter animation (number counting up)
 */
export function useGSAPCounter(
  targetValue: number,
  options?: {
    duration?: number;
    delay?: number;
    suffix?: string;
    prefix?: string;
  }
) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduceMotionOrEffects()) return;

    const { duration = 1.5, delay = 0, suffix = "", prefix = "" } = options || {};
    const counter = { value: 0 };

    const ctx = gsap.context(() => {
      gsap.to(counter, {
        value: targetValue,
        duration,
        delay,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        onUpdate: () => {
          if (ref.current) {
            ref.current.textContent = `${prefix}${Math.round(counter.value)}${suffix}`;
          }
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [targetValue, options]);

  return ref;
}

/**
 * GSAP magnetic hover effect
 */
export function useGSAPMagnetic(strength: number = 0.3) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduceMotionOrEffects()) return;
    const el = ref.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, {
        x: x * strength,
        y: y * strength,
        duration: 0.4,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [strength]);

  return ref;
}

/**
 * GSAP parallax effect on scroll
 */
export function useGSAPParallax(speed: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduceMotionOrEffects()) return;

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        y: () => speed * 100,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [speed]);

  return ref;
}

/**
 * GSAP staggered grid animation
 */
export function useGSAPStaggerGrid(options?: {
  duration?: number;
  stagger?: number;
  y?: number;
  scale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduceMotionOrEffects()) return;

    const { duration = 0.6, stagger = 0.08, y = 30, scale = 0.95 } = options || {};

    const ctx = gsap.context(() => {
      gsap.from(ref.current!.children, {
        opacity: 0,
        y,
        scale,
        duration,
        stagger: {
          amount: stagger * (ref.current!.children.length || 1),
          from: "start",
        },
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [options]);

  return ref;
}

/**
 * ✨ Premium GSAP page entrance with refined timing, easing & cascading animations.
 * Animates container → sections (`[data-gsap-section]`) → cards (`[data-gsap-card]`)
 * → stat items (`[data-gsap-stat]`) with overlapping timelines for smooth feel.
 */
export function useGSAPPageEntrance() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let failsafeTimeout: number | undefined;

    const ensureVisible = () => {
      if (!containerRef.current) return;
      const sections = containerRef.current.querySelectorAll("[data-gsap-section]");
      const cards = containerRef.current.querySelectorAll("[data-gsap-card]");
      const stats = containerRef.current.querySelectorAll("[data-gsap-stat]");
      const actions = containerRef.current.querySelectorAll("[data-gsap-action]");

      // If GSAP is interrupted (e.g., dev StrictMode, route transitions), avoid leaving content hidden.
      const targets = [
        containerRef.current,
        ...Array.from(sections),
        ...Array.from(cards),
        ...Array.from(stats),
        ...Array.from(actions),
      ].filter(Boolean);

      if (targets.length === 0) return;

      gsap.set(targets, {
        opacity: 1,
        clearProps: "transform",
      });
    };

    // Reduced motion/perf mode: no entrance animations, but keep everything visible.
    if (shouldReduceMotionOrEffects()) {
      ensureVisible();
      return;
    }

    const ctx = gsap.context(() => {
      try {
        const tl = gsap.timeline({
          defaults: { ease: "power4.out" },
          onComplete: ensureVisible,
        });

        // 1. Container fade in with slight upward motion
        tl.from(containerRef.current, {
          opacity: 0,
          y: 8,
          duration: 0.35,
          ease: "power2.out",
          immediateRender: false,
        });

        // 2. Stagger sections with smooth slide-up
        const sections = containerRef.current!.querySelectorAll("[data-gsap-section]");
        if (sections.length > 0) {
          tl.from(
            sections,
            {
              opacity: 0,
              y: 30,
              duration: 0.6,
              stagger: 0.08,
              ease: "power3.out",
              immediateRender: false,
            },
            "-=0.15"
          );
        }

        // 3. Animate cards with scale bounce
        const cards = containerRef.current!.querySelectorAll("[data-gsap-card]");
        if (cards.length > 0) {
          tl.from(
            cards,
            {
              opacity: 0,
              y: 16,
              scale: 0.96,
              duration: 0.5,
              stagger: 0.05,
              ease: "back.out(1.4)",
              immediateRender: false,
            },
            "-=0.4"
          );
        }

        // 4. Animate stat numbers with counter effect
        const stats = containerRef.current!.querySelectorAll("[data-gsap-stat]");
        if (stats.length > 0) {
          tl.from(
            stats,
            {
              opacity: 0,
              y: 10,
              scale: 0.9,
              duration: 0.4,
              stagger: 0.04,
              ease: "back.out(2)",
              immediateRender: false,
            },
            "-=0.35"
          );
        }

        // 5. Animate action buttons
        const actions = containerRef.current!.querySelectorAll("[data-gsap-action]");
        if (actions.length > 0) {
          tl.from(
            actions,
            {
              opacity: 0,
              x: -10,
              duration: 0.35,
              stagger: 0.04,
              ease: "power2.out",
              immediateRender: false,
            },
            "-=0.3"
          );
        }

        // Failsafe: if something interrupts early, force visibility shortly after.
        failsafeTimeout = window.setTimeout(ensureVisible, 1200);
      } catch {
        ensureVisible();
      }
    }, containerRef);

    return () => {
      if (failsafeTimeout) window.clearTimeout(failsafeTimeout);
      ctx.revert();
    };
  }, []);

  return containerRef;
}

/**
 * GSAP smooth progress bar
 */
export function useGSAPProgress(value: number, options?: { duration?: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduceMotionOrEffects()) return;

    const { duration = 1.2, delay = 0 } = options || {};

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        width: `${value}%`,
        duration,
        delay,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [value, options]);

  return ref;
}

/**
 * ✨ GSAP modal/dialog entrance animation
 */
export function useGSAPModalEntrance() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduceMotionOrEffects()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(ref.current, {
        opacity: 0,
        scale: 0.95,
        y: 20,
        duration: 0.4,
        ease: "back.out(1.5)",
      });

      // Animate child sections
      const sections = ref.current!.children;
      if (sections.length > 0) {
        tl.from(
          Array.from(sections),
          {
            opacity: 0,
            y: 12,
            duration: 0.35,
            stagger: 0.06,
          },
          "-=0.2"
        );
      }
    }, ref);

    return () => ctx.revert();
  }, []);

  return ref;
}

/**
 * ✨ GSAP card hover glow effect
 */
export function useGSAPCardHover() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduceMotionOrEffects()) return;
    const el = ref.current;

    const handleMouseEnter = () => {
      gsap.to(el, {
        y: -3,
        boxShadow: "0 12px 40px -8px rgba(99, 102, 241, 0.15), 0 4px 12px -4px rgba(0,0,0,0.06)",
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        y: 0,
        boxShadow: "0 1px 3px rgba(99,102,241,0.05), 0 4px 16px rgba(99,102,241,0.04)",
        duration: 0.4,
        ease: "power2.out",
      });
    };

    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return ref;
}
