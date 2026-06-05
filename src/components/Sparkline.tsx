import type { DayBar } from "../lib/leetcode";
import { weekdayInitial } from "../lib/leetcode";

interface SparklineProps {
  days: DayBar[];
  color: string;
}

/**
 * 7-day mini bar chart — one bar per UTC day, labeled by weekday initial.
 * Bars are scaled to the user's own busiest day in the window.
 */
export default function Sparkline({ days, color }: SparklineProps) {
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="flex items-end justify-between gap-1.5" aria-hidden>
      {days.map((d) => {
        const heightPct = d.count === 0 ? 0 : Math.max(8, (d.count / max) * 100);
        return (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-16 w-full items-end">
              <div
                className="w-full rounded-sm transition-all duration-300"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: d.count === 0 ? "#21262d" : color,
                  minHeight: d.count === 0 ? "3px" : undefined,
                  opacity: d.count === 0 ? 0.6 : 1,
                }}
                title={`${d.day}: ${d.count}`}
              />
            </div>
            <span className="font-mono text-[10px] text-muted">
              {weekdayInitial(d.day)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
