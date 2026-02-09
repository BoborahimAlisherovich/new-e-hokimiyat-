"use client";

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
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
 * Simple GSAP timeline for page entrance
 */
export function useGSAPPageEntrance() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      
      tl.from(containerRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
      });

      const sections = containerRef.current!.querySelectorAll("[data-gsap-section]");
      if (sections.length > 0) {
        tl.from(
          sections,
          {
            opacity: 0,
            y: 30,
            duration: 0.6,
            stagger: 0.12,
            ease: "power3.out",
          },
          "-=0.1"
        );
      }
    }, containerRef);

    return () => ctx.revert();
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
