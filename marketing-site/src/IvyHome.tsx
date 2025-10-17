// src/pages/IvyHome.tsx
import * as React from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "./components/ui/button";

export default function IvyHome() {
  const pageStyle = { ["--radius" as any]: "0.5rem" } as React.CSSProperties;
  return (
    <div className="min-h-screen bg-surface-primary text-text-primary" style={pageStyle}>
      {/* Header (glass with subtle green accents) */}
      <header className="relative bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b border-border/60 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-24 h-40 w-40 rounded-full blur-2xl glow-white" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full blur-2xl glow-green" />
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-forest-green flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div className="font-semibold tracking-tight">IvyOS</div>
          </div>
        </div>
      </header>

      {/* Hero (coming soon) */}
      <section>
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium forest-bg text-text-secondary border border-border">
              Coming soon
            </div>
            <div className="mt-3 text-5xl md:text-7xl font-[900] tracking-[-0.02em] text-foreground">
              IvyOS
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-[700] leading-tight tracking-[-0.02em] text-forest-green whitespace-nowrap">
              <span className="relative inline-block align-bottom">
                <span>The Higher Education</span>
                <span className="absolute left-0 -bottom-1 h-[2px] w-full bg-gradient-to-r from-forest-green to-accent rounded-full" />
              </span>
              <span className="ml-2">OS</span>
            </h1>
            <p className="mt-4 text-lg text-text-secondary max-w-2xl">
              Built from first-hand experience in Higher Education, IvyOS combines AI and machine learning to give institutions a single view of the student journey - from enquiry to alumni. It replaces fragmented systems with one intelligent platform designed for outcomes, not admin.
            </p>
            <p className="mt-3 text-text-secondary">Minimal, decisive, and built for outcomes.</p>
            <p className="mt-3 text-sm text-text-secondary">MVP Preview: Applications Board · Conversations · Forecasting</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="mailto:laurence@ivy-os.io">
                <Button variant="forestAccent">
                  Join waitlist
                  <ArrowRight className="ml-1" />
                </Button>
              </a>
              <a href="mailto:laurence@ivy-os.io">
                <Button variant="forest">Contact</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (minimal contact) */}
      <footer id="contact" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-text-secondary flex flex-col md:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} IvyOS — Higher Education OS</div>
          <div>
            <a href="mailto:laurence@ivy-os.io" className="hover:text-text-primary">laurence@ivy-os.io</a>
          </div>
        </div>
      </footer>
    </div>
  );
}


