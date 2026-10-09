import type { ReactNode } from 'react';

/* ========================================================================== *
 * Shared visual chrome for the custom PON nodes.
 * ========================================================================== */

interface NodeShellProps {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  accent: string;
  ringClass?: string;
  selected?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

export function NodeShell({
  eyebrow,
  title,
  icon,
  accent,
  ringClass = 'border-noc-600',
  selected = false,
  children,
  footer,
}: NodeShellProps) {
  return (
    <div
      className={`node-shell w-full rounded-xl border bg-noc-900/95 shadow-panel backdrop-blur-sm transition-all duration-200 ${ringClass} ${
        selected ? 'border-sky-400/90' : ''
      }`}
    >
      <div
        className="flex items-center gap-2 border-b border-noc-700/70 px-2.5 py-1.5"
        style={{ background: `linear-gradient(90deg, ${accent}1f, transparent 70%)` }}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{ background: `${accent}26`, color: accent }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-noc-400">{eyebrow}</div>
          <div className="truncate text-[13px] font-semibold leading-tight text-noc-200">{title}</div>
        </div>
      </div>
      <div className="px-2.5 py-2">{children}</div>
      {footer ? <div className="border-t border-noc-700/60 px-2.5 py-1.5">{footer}</div> : null}
    </div>
  );
}

interface LedProps {
  color: string;
  pulse?: boolean;
  size?: number;
}

export function Led({ color, pulse = false, size = 9 }: LedProps) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${pulse ? 'animate-pulse' : ''}`}
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: `0 0 ${size + 4}px ${color}, 0 0 2px ${color}`,
      }}
    />
  );
}

interface StatProps {
  label: string;
  value: ReactNode;
  tone?: string;
}

export function Stat({ label, value, tone = 'text-noc-200' }: StatProps) {
  return (
    <div className="metric flex flex-col gap-0.5">
      <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-noc-400">{label}</span>
      <span className={`font-mono text-[12px] font-semibold leading-tight ${tone}`}>{value}</span>
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className = 'bg-noc-700/70 text-noc-300 border-noc-600' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-[1px] font-mono text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}
