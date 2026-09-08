"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface AnimatedBackgroundProps {
  variant?: "dashboard" | "login" | "minimal";
  className?: string;
}

/**
 * Animated gradient mesh background with floating orbs
 * Uses GSAP for smooth, performant animations
 */
export function AnimatedBackground({ variant = "dashboard", className = "" }: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const orbs = containerRef.current.querySelectorAll(".gsap-orb");

    const ctx = gsap.context(() => {
      orbs.forEach((orb, i) => {
        // Random starting position offset
        gsap.set(orb, {
          x: Math.random() * 100 - 50,
          y: Math.random() * 100 - 50,
        });

        // Continuous floating animation
        gsap.to(orb, {
          x: `random(-80, 80)`,
          y: `random(-80, 80)`,
          scale: `random(0.8, 1.2)`,
          duration: `random(8, 14)`,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.5,
        });

        // Subtle opacity pulsing
        gsap.to(orb, {
          opacity: `random(0.3, 0.7)`,
          duration: `random(4, 8)`,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.3,
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [variant]);

  if (variant === "minimal") {
    return (
      <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <div className="gsap-orb absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/15 to-cyan-300/10 blur-3xl" />
        <div className="gsap-orb absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-violet-400/10 to-purple-300/8 blur-3xl" />
      </div>
    );
  }

  if (variant === "login") {
    return (
      <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <div className="gsap-orb absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-400/15 blur-3xl" />
        <div className="gsap-orb absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-500/20 to-purple-400/15 blur-3xl" />
        <div className="gsap-orb absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-emerald-400/15 to-teal-300/10 blur-3xl" />
        <div className="gsap-orb absolute bottom-[20%] left-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-amber-400/12 to-orange-300/8 blur-3xl" />
      </div>
    );
  }

  // Dashboard variant
  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Primary blue orb - top left */}
      <div className="gsap-orb absolute top-[-5%] left-[-3%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/12 to-cyan-300/8 blur-3xl" />
      
      {/* Purple orb - top right */}
      <div className="gsap-orb absolute top-[10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-violet-400/10 to-indigo-300/8 blur-3xl" />
      
      {/* Emerald orb - center */}
      <div className="gsap-orb absolute top-[45%] left-[30%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-emerald-400/8 to-teal-300/6 blur-3xl" />
      
      {/* Amber orb - bottom right */}
      <div className="gsap-orb absolute bottom-[5%] right-[15%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-amber-400/8 to-orange-300/6 blur-3xl" />
      
      {/* Rose orb - bottom left */}
      <div className="gsap-orb absolute bottom-[-5%] left-[5%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-rose-400/8 to-pink-300/6 blur-3xl" />

      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
    </div>
  );
}

/**
 * Animated gradient text component
 */
export function GradientText({ 
  children, 
  className = "",
  gradient = "from-blue-600 via-indigo-600 to-violet-600"
}: { 
  children: React.ReactNode; 
  className?: string;
  gradient?: string;
}) {
  return (
    <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
}

/**
 * Animated card wrapper with GSAP hover effects
 */
export function AnimatedCard({ 
  children, 
  className = "",
  hoverScale = 1.02,
  hoverY = -4,
}: { 
  children: React.ReactNode; 
  className?: string;
  hoverScale?: number;
  hoverY?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const handleEnter = () => {
      gsap.to(el, {
        scale: hoverScale,
        y: hoverY,
        duration: 0.3,
        ease: "power2.out",
        boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.15), 0 8px 20px -8px rgba(59, 130, 246, 0.1)",
      });
    };

    const handleLeave = () => {
      gsap.to(el, {
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)",
      });
    };

    el.addEventListener("mouseenter", handleEnter);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      el.removeEventListener("mouseenter", handleEnter);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [hoverScale, hoverY]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
