import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-18">
        <div className="mb-8 animate-title-reveal">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Why this exists</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[var(--color-text-primary)] tracking-tighter">
            About EatDiscounted
          </h1>
          <div className="brand-rule animate-line-grow mt-4 max-w-28"></div>
        </div>

        <div className="space-y-6 text-[var(--color-text-secondary)] leading-relaxed animate-fade-in">
          <p className="text-lg text-[var(--color-text-primary)]">
            I built this because I was tired of checking 5 different apps before every dinner.
          </p>
          <p>
            Living in NYC, there are over a dozen platforms that offer cashback, points, or discounts at restaurants — Upside, Nea, Blackbird, Bilt, Rakuten, inKind, and more. Each one has different restaurants, different reward types, and no way to compare them.
          </p>
          <p>
            So I&apos;d open Upside, check if the restaurant was there. Then Bilt. Then Nea. Then Rakuten. Every single time. It was annoying.
          </p>
          <p className="text-[var(--color-text-primary)] font-medium">
            EatDiscounted checks all of them at once. Type a restaurant name, and in a few seconds you see every deal available — real cashback, discounts, and credit card rewards.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-white p-6 animate-fade-in-up shadow-sm">
          <h2 className="font-bold text-[var(--color-text-primary)] mb-3">How it works</h2>
          <div className="grid gap-4 text-center text-sm sm:grid-cols-4">
            <div>
              <div className="w-9 h-9 mx-auto rounded-full bg-[var(--color-accent)] text-white text-xs font-black flex items-center justify-center mb-2">1</div>
              <p className="text-[var(--color-text-muted)]">Type a name</p>
            </div>
            <div>
              <div className="w-9 h-9 mx-auto rounded-full bg-[var(--color-accent)] text-white text-xs font-black flex items-center justify-center mb-2">2</div>
              <p className="text-[var(--color-text-muted)]">We check 12+ programs</p>
            </div>
            <div>
              <div className="w-9 h-9 mx-auto rounded-full bg-[var(--color-accent)] text-white text-xs font-black flex items-center justify-center mb-2">3</div>
              <p className="text-[var(--color-text-muted)]">See every deal</p>
            </div>
            <div>
              <div className="w-9 h-9 mx-auto rounded-full bg-[var(--color-accent)] text-white text-xs font-black flex items-center justify-center mb-2">4</div>
              <p className="text-[var(--color-text-muted)]">Open the app</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)] italic">
            NYC-focused. Built by a New Yorker who eats out too much.
          </p>
          <Link href="/platforms" className="touch-target inline-flex items-center rounded-xl text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] font-semibold transition-colors">
            View platforms →
          </Link>
        </div>
      </main>
    </>
  );
}
