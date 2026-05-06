"use client";

import { useEffect, useRef, useCallback } from "react";

interface PlatformInfo {
  howItWorks: string;
  whoItsFor: string;
  example: string;
}

const PLATFORM_INFO: Record<string, PlatformInfo> = {
  Blackbird: {
    howItWorks: "Free app — earn crypto rewards ($FLY tokens) per visit. Card-linked, auto-tracks visits.",
    whoItsFor: "Anyone with the app",
    example: "Visit 3x, earn $5 in FLY tokens",
  },
  Upside: {
    howItWorks: "Card-linked cashback that auto-applies when you pay. Link any credit/debit card.",
    whoItsFor: "Anyone — link any credit card",
    example: "Spend $50, earn $2–5 cashback",
  },
  "Bilt Rewards": {
    howItWorks: "Earn transferable points on dining with your Bilt Mastercard. Up to 11x on Rent Day.",
    whoItsFor: "Bilt Mastercard holders",
    example: "3x points per $1 at select restaurants",
  },
  "Rewards Network": {
    howItWorks: "Earn airline miles or hotel points when you dine. Link your credit card to your loyalty program.",
    whoItsFor: "Link credit card to airline/hotel program",
    example: "5 AA miles per $1 spent",
  },
  inKind: {
    howItWorks: "Buy house account credit at a discount — prepay and save on future visits.",
    whoItsFor: "Anyone — prepay for savings",
    example: "Buy $100 credit for $80",
  },
  Nea: {
    howItWorks: "Card-linked personalized cashback. Daily rewards vary — avg ~6% back to Venmo.",
    whoItsFor: "iOS app users (NYC only)",
    example: "5–15% back at select restaurants",
  },
  "Rakuten Dining": {
    howItWorks: "Card-linked cashback through Rakuten's dining program. 10% back with Rakuten Amex.",
    whoItsFor: "Rakuten members",
    example: "5–10% cashback at participating spots",
  },
  "Too Good To Go": {
    howItWorks: "Rescue unsold food from restaurants at ~⅓ the retail price. Surprise bags — you don't pick items.",
    whoItsFor: "Anyone with the app",
    example: "$5–7 surprise bags worth $15–20",
  },
  Pulsd: {
    howItWorks: "Curated NYC dining events and experiences at steep discounts. Prepaid prix-fixe deals.",
    whoItsFor: "NYC residents",
    example: "35–69% off dining events",
  },
  "Restaurant.com": {
    howItWorks: "Buy discount dining certificates online. Pay $4–10 for a $25 certificate.",
    whoItsFor: "Anyone",
    example: "$25 certificate for $4–10",
  },
  Groupon: {
    howItWorks: "Daily deals and discount vouchers for restaurants. Buy upfront, redeem when you visit.",
    whoItsFor: "Anyone",
    example: "40–60% off prix fixe meals",
  },
  LivingSocial: {
    howItWorks: "Local deals platform — similar to Groupon. Discounted dining experiences and vouchers.",
    whoItsFor: "Anyone",
    example: "Discounted dining experiences",
  },
  "The Infatuation": {
    howItWorks: "Editorial deal roundups from trusted restaurant critics. Curated picks, not a marketplace.",
    whoItsFor: "NYC diners seeking curated picks",
    example: "Curated lists of best current deals",
  },
  Eater: {
    howItWorks: "Editorial coverage of restaurant deals, promotions, and dining events.",
    whoItsFor: "Food-focused readers",
    example: "Deal alerts and roundups",
  },
};

const CARD_LINKED_PLATFORMS = ["Upside", "Nea", "Rewards Network", "Bilt Rewards"];

interface PlatformExplainerProps {
  platformName: string;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

export function PlatformExplainer({ platformName, isOpen, onClose, anchorRef }: PlatformExplainerProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const isCardLinked = CARD_LINKED_PLATFORMS.includes(platformName);
  const info = PLATFORM_INFO[platformName];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Tab" && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    const closeButton = modalRef.current?.querySelector<HTMLElement>("button");
    closeButton?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || !info) return null;

  // Mobile: full overlay modal. Desktop: positioned popover.
  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden animate-fade-in"
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`How ${platformName} works`}
        className="
          fixed inset-x-4 bottom-4 top-auto z-50 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:bottom-auto
          w-auto sm:w-80
          rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5
          shadow-2xl shadow-black/40
          animate-fade-in-up
        "
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
            How {platformName} works
          </h3>
          <button
            onClick={onClose}
            aria-label="Close explainer"
            className="shrink-0 rounded-lg p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">How it works</p>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">{info.howItWorks}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Who it&apos;s for</p>
            <p className="text-[var(--color-text-secondary)]">{info.whoItsFor}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Example</p>
            <p className="text-[var(--color-gold)] font-medium">{info.example}</p>
          </div>
        </div>

        {isCardLinked && (
          <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-warning)] leading-relaxed">
              ⚠️ Card-linked platforms (Upside, Nea, Rewards Network) may conflict — you can usually only link one per credit card.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
