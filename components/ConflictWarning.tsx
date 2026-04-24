interface ConflictWarningProps {
  platforms: string[];
  message: string;
}

export function ConflictWarning({ platforms, message }: ConflictWarningProps) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <div>
          <p className="font-medium text-amber-800">Card Conflict</p>
          <p className="mt-1 text-sm text-amber-700">{message}</p>
          <p className="mt-1 text-xs text-amber-600">
            Platforms: {platforms.join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
}
