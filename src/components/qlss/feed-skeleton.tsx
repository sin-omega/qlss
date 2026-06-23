/**
 * Skeleton placeholder rows for the trending / recent feeds while loading.
 * Uses the .skeleton-bar shimmer animation from globals.css.
 */

interface FeedSkeletonProps {
  rows?: number;
  variant?: "trending" | "recent";
}

export function FeedSkeleton({ rows = 5, variant = "trending" }: FeedSkeletonProps) {
  return (
    <div aria-hidden="true" className="divide-y divide-border/50">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          {variant === "trending" && (
            <div
              className="skeleton-bar shrink-0"
              style={{ width: "1.5rem", height: "1rem" }}
            />
          )}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div
              className="skeleton-bar"
              style={{ width: `${60 + ((i * 13) % 30)}%`, height: "0.75rem" }}
            />
            {variant === "trending" && (
              <div
                className="skeleton-bar"
                style={{ width: "100%", height: "0.25rem" }}
              />
            )}
          </div>
          <div
            className="skeleton-bar shrink-0"
            style={{ width: "2.5rem", height: "0.75rem" }}
          />
        </div>
      ))}
    </div>
  );
}
