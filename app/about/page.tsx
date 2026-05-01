import { Nav } from "@/components/Nav";

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="text-2xl font-bold">About EatDiscounted</h1>

        <div className="mt-6 space-y-4 text-gray-700 leading-relaxed">
          <p>
            There are so many dining discount platforms now — Blackbird,
            Upside, Nea, inKind, Bilt, Rakuten Dining, Too Good To Go — and
            they all work differently. Points, cashback, credits, surprise bags.
            Some are personalized, some require a linked card, and some of them
            even conflict with each other.
          </p>
          <p>
            The problem? When you&apos;re heading out to eat with friends, you
            shouldn&apos;t have to open 5+ apps just to make sure you&apos;re
            not leaving money on the table. But that&apos;s exactly what it
            takes to check whether the restaurant you&apos;re going to is on any
            of these platforms.
          </p>
          <p>
            <strong>EatDiscounted</strong> fixes that. Search a restaurant name
            and instantly see which discount platforms have it — all in one
            place. No more app-hopping before dinner.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">How it works</h2>
          <ol className="mt-3 space-y-2 text-sm text-gray-600 list-decimal list-inside">
            <li>Type a restaurant name</li>
            <li>We check all 8 discount platforms in seconds</li>
            <li>See which apps have your restaurant + what type of deal</li>
            <li>Open the app and claim your discount</li>
          </ol>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">What we don&apos;t do</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-600 list-disc list-inside">
            <li>We don&apos;t show your specific discount — many platforms personalize offers per user</li>
            <li>We don&apos;t scrape or access any private data — just public sitemaps and web search</li>
            <li>We don&apos;t replace any app — we just help you know which one to open</li>
          </ul>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          Built because checking 5 apps before dinner is annoying.
        </p>
      </main>
    </>
  );
}
