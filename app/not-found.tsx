import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-500">
        This page doesn&apos;t exist. Maybe you were looking for a restaurant?
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
      >
        Back to search
      </Link>
    </main>
  );
}
