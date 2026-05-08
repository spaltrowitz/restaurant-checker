import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ACTIVE_PLATFORMS } from "@/lib/platforms";

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
        <div className="mb-8 animate-title-reveal">
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-text-primary)] tracking-tighter">
            About
          </h1>
          <div className="h-1 rounded-full bg-gradient-to-r from-[#ff6b35] via-[#ec4899] to-[#8b5cf6] animate-line-grow mt-4"></div>
        </div>

        <div className="space-y-6 text-[var(--color-text-secondary)] leading-relaxed animate-fade-in">
          <p className="text-lg text-[var(--color-text-primary)]">
            I built this because I was tired of checking 5 different apps before every dinner.
          </p>
          <p>
            Living in NYC, there are a lot of cashback apps, loyalty programs, and discount platforms for restaurants. Each one has different restaurants, different reward types, and no way to compare them.
          </p>
          <p>
            So I&apos;d open Upside, check if the restaurant was there. Then Nea. Then Rakuten. Every single time. It was annoying.
          </p>
          <p className="text-[var(--color-text-primary)] font-medium">
            EatDiscounted checks all of them at once. Type a restaurant name, and in a few seconds you see every deal available — real cashback, discounts, and credit card rewards.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-white p-6 animate-fade-in-up">
          <h2 className="font-bold text-[var(--color-text-primary)] mb-3">How it works</h2>
          <div className="grid grid-cols-4 gap-4 text-center text-sm">
            <div>
              <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-[#ff6b35] to-[#e55a2b] text-white text-xs font-black flex items-center justify-center mb-2">1</div>
              <p className="text-[var(--color-text-muted)]">Type a name</p>
            </div>
            <div>
              <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-[#ff6b35] to-[#e55a2b] text-white text-xs font-black flex items-center justify-center mb-2">2</div>
              <p className="text-[var(--color-text-muted)]">We check {ACTIVE_PLATFORMS.length} programs</p>
            </div>
            <div>
              <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-[#ff6b35] to-[#e55a2b] text-white text-xs font-black flex items-center justify-center mb-2">3</div>
              <p className="text-[var(--color-text-muted)]">See every deal</p>
            </div>
            <div>
              <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-[#ff6b35] to-[#e55a2b] text-white text-xs font-black flex items-center justify-center mb-2">4</div>
              <p className="text-[var(--color-text-muted)]">Open the app</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)] italic">
            NYC-focused. Built by a New Yorker who eats out too much.
          </p>
          <Link href="/platforms" className="text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] font-semibold transition-colors">
            View platforms →
          </Link>
        </div>
      </main>
    </>
  );
}
