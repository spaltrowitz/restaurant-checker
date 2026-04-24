import { Nav } from "@/components/Nav";
import {
  PLATFORMS,
  getConflictingPlatforms,
} from "@/lib/platforms";

export default function PlatformsPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="text-2xl font-bold">📋 Supported Platforms</h1>
        <p className="mt-2 text-sm text-gray-500">
          8 dining discount platforms we check. Each works differently.
        </p>

        <div className="mt-8 grid gap-4">
          {PLATFORMS.map((p) => {
            const conflicts = getConflictingPlatforms(p.name);
            return (
              <div
                key={p.name}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    {p.rewardEmoji} {p.rewardLabel}
                  </span>
                  {p.appOnly && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      📱 App-only
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-gray-600">{p.offerType}</p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 ${p.personalized ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}
                  >
                    {p.personalized ? "👤 Personalized" : "🏷️ Uniform offers"}
                  </span>
                  {p.cardLink && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                      🔗 Card-linked
                    </span>
                  )}
                  {!p.cardLink && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                      No card needed
                    </span>
                  )}
                </div>

                {conflicts.length > 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    ⚠️ Card conflicts with: {conflicts.join(", ")}
                  </p>
                )}

                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm text-blue-600 hover:underline"
                >
                  {p.url} →
                </a>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-800">⚠️ Card Conflict Note</p>
          <p className="mt-1 text-sm text-amber-700">
            Seated, Upside, and Nea all require a linked debit/credit card and
            block the same card from being used across competing apps. Link a
            different card to each, or pick one cashback app per card.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="font-medium text-blue-800">📝 Personalization Note</p>
          <p className="mt-1 text-sm text-blue-700">
            Blackbird, Seated, Upside, and Nea serve personalized offers —
            different users see different discounts at the same restaurant. This
            tool checks whether a restaurant is listed, not what specific
            discount you&apos;ll get.
          </p>
        </div>
      </main>
    </>
  );
}
