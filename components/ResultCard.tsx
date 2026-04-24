import { CheckResult, getPlatform } from "@/lib/platforms";

interface ResultCardProps {
  result: CheckResult | null; // null = loading
  platformName: string;
}

export function ResultCard({ result, platformName }: ResultCardProps) {
  const platform = getPlatform(platformName);

  if (!result) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mt-0.5 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        <div className="flex-1">
          <p className="font-medium text-gray-700">{platformName}</p>
          <p className="text-sm text-gray-400">Checking…</p>
        </div>
      </div>
    );
  }

  if (result.found) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
        <span className="mt-0.5 text-lg">✅</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-900">{platformName}</p>
            {platform && (
              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                {platform.rewardEmoji} {platform.rewardLabel}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 truncate">{result.details}</p>
          {result.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-blue-600 hover:underline truncate max-w-full"
            >
              {result.url}
            </a>
          )}
          {platform?.personalized && (
            <p className="mt-1 text-xs text-amber-600">
              ⚠️ Offers are personalized — your discount may differ
            </p>
          )}
        </div>
      </div>
    );
  }

  if (result.searchUnavailable) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <span className="mt-0.5 text-lg">🔗</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-amber-800">{platformName}</p>
            {platform && (
              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                {platform.rewardEmoji} {platform.rewardLabel}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-amber-700">{result.details}</p>
          <a
            href={platform?.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-200 transition-colors"
          >
            {platform?.appOnly ? "📱 Open app" : "🔗 Open"} {platformName} →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <span className="mt-0.5 text-lg">❌</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-500">{platformName}</p>
        <p className="mt-1 text-sm text-gray-400">{result.details}</p>
        {platform?.appOnly && !result.found && (
          <a
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-blue-500 hover:underline"
          >
            📱 Check the app →
          </a>
        )}
      </div>
    </div>
  );
}
