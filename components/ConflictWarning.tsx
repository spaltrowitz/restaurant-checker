interface ConflictWarningProps {
  platforms: string[];
  message: string;
}

export function ConflictWarning({ platforms, message }: ConflictWarningProps) {
  return (
    <div className="rounded-xl border border-[var(--color-warning)]/20 bg-[var(--color-warning-dim)] p-5 animate-fade-in">
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div>
          <p className="font-semibold text-[var(--color-warning)]">Card Conflict</p>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">{message}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Platforms: {platforms.join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
}
