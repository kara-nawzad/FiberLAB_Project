import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ChevronDown,
  Layers,
  Loader2,
  Network,
  Trash2,
  Zap,
} from 'lucide-react';
import type { DesignSettings, NetworkSummary } from '../types';
import { PRESETS } from '../engine/presets';

/* ========================================================================== *
 * Top navigation — brand, live health pulse, presets, global actions.
 * ========================================================================== */

type Health = 'green' | 'amber' | 'red' | 'idle';

interface TopBarProps {
  summary: NetworkSummary;
  settings: DesignSettings;
  onSettingsChange: (patch: Partial<DesignSettings>) => void;
  onPreset: (presetId: string) => void;
  onRunTest: () => void;
  onOpenBOM: () => void;
  onClear: () => void;
  testing: boolean;
  stale: boolean;
  activePresetId: string | null;
}

function deriveHealth(summary: NetworkSummary): Health {
  if (summary.ontCount === 0) return 'idle';
  if (summary.byStatus.LOS > 0 || summary.byStatus.DISCONNECTED > 0) return 'red';
  if (summary.byStatus.WARNING > 0 || summary.byStatus.OVERLOAD > 0) return 'amber';
  return 'green';
}

const HEALTH_HEX: Record<Health, string> = {
  green: '#22d383',
  amber: '#f5b544',
  red: '#f0544f',
  idle: '#5d6c8f',
};

const HEALTH_TEXT: Record<Health, string> = {
  green: 'All subscribers optimal',
  amber: 'Marginal links detected',
  red: 'Fault on the network',
  idle: 'No subscribers provisioned',
};

function Pulse({ health }: { health: Health }) {
  const hex = HEALTH_HEX[health];
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
      {health !== 'idle' ? (
        <span
          className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full"
          style={{ background: hex }}
        />
      ) : null}
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full"
        style={{ background: hex, boxShadow: `0 0 10px ${hex}` }}
      />
    </span>
  );
}

export function TopBar({
  summary,
  settings,
  onSettingsChange,
  onPreset,
  onRunTest,
  onOpenBOM,
  onClear,
  testing,
  stale,
  activePresetId,
}: TopBarProps) {
  const [presetOpen, setPresetOpen] = useState(false);
  const presetRef = useRef<HTMLDivElement | null>(null);
  const health = deriveHealth(summary);

  useEffect(() => {
    if (!presetOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (presetRef.current && !presetRef.current.contains(event.target as globalThis.Node)) {
        setPresetOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [presetOpen]);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-noc-700/70 bg-noc-900/90 px-3 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/30 to-emerald-500/20 text-sky-300 ring-1 ring-sky-400/30">
          <Network size={17} />
        </span>
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-noc-200">
            FTTH<span className="text-sky-400">-</span>Studio
          </div>
          <div className="text-[9px] uppercase tracking-[0.16em] text-noc-500">
            PON Designer · ITU-T G.984
          </div>
        </div>
      </div>

      <div className="mx-1 h-8 w-px bg-noc-700/70" />

      <div
        className="flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-1.5"
        style={{ borderColor: `${HEALTH_HEX[health]}44`, background: `${HEALTH_HEX[health]}0f` }}
      >
        <Pulse health={health} />
        <span className="truncate text-[11px] font-medium" style={{ color: HEALTH_HEX[health] }}>
          {HEALTH_TEXT[health]}
        </span>
        <span className="ml-1 flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-noc-400">
          <span className="text-emerald-300">{summary.byStatus.ONLINE} up</span>
          <span className="text-amber-300">{summary.byStatus.WARNING} warn</span>
          <span className="text-red-300">{summary.byStatus.LOS + summary.byStatus.DISCONNECTED} down</span>
        </span>
      </div>

      {/* Presets ---------------------------------------------------------- */}
      <div className="relative ml-auto" ref={presetRef}>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setPresetOpen((open) => !open)}
          aria-expanded={presetOpen}
        >
          <Layers size={13} />
          Preset Topologies
          <ChevronDown size={13} className={`transition-transform ${presetOpen ? 'rotate-180' : ''}`} />
        </button>
        {presetOpen ? (
          <div className="panel absolute right-0 top-[calc(100%+6px)] z-40 w-[330px] overflow-hidden rounded-lg shadow-panel">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`block w-full border-b border-noc-700/50 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-noc-800 ${
                  activePresetId === preset.id ? 'bg-sky-500/10' : ''
                }`}
                onClick={() => {
                  onPreset(preset.id);
                  setPresetOpen(false);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-noc-200">{preset.name}</span>
                  {activePresetId === preset.id ? (
                    <span className="font-mono text-[9px] text-sky-300">LOADED</span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-[10px] leading-snug text-noc-400">{preset.description}</div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Global design settings ------------------------------------------- */}
      <div className="flex items-center gap-1.5 rounded-md border border-noc-700/70 bg-noc-950/60 px-2 py-1">
        <label htmlFor="safety-margin" className="text-[10px] uppercase tracking-wide text-noc-400">
          Margin
        </label>
        <input
          id="safety-margin"
          type="number"
          min={0}
          max={10}
          step={0.5}
          className="input !w-14 !border-0 !bg-transparent !py-0 !text-center !text-[11px]"
          value={settings.safetyMarginDb}
          onChange={(event) =>
            onSettingsChange({ safetyMarginDb: Math.max(0, Number(event.target.value) || 0) })
          }
        />
        <span className="text-[10px] text-noc-500">dB</span>
        <span className="mx-1 h-4 w-px bg-noc-700" />
        <button
          type="button"
          role="switch"
          aria-checked={settings.autoRun}
          onClick={() => onSettingsChange({ autoRun: !settings.autoRun })}
          title="Recalculate the optical budget on every edit"
          className="flex items-center gap-1.5"
        >
          <span
            className={`relative h-4 w-8 rounded-full transition-colors ${
              settings.autoRun ? 'bg-emerald-500/80' : 'bg-noc-600'
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                settings.autoRun ? 'translate-x-[17px]' : 'translate-x-0.5'
              }`}
            />
          </span>
          <span className="text-[10px] text-noc-300">Auto</span>
        </button>
      </div>

      {/* Actions ----------------------------------------------------------- */}
      <button type="button" className="btn-primary" onClick={onRunTest} disabled={testing}>
        {testing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
        Run Light Test
      </button>
      <button type="button" className="btn-ghost" onClick={onOpenBOM}>
        <Activity size={13} />
        Bill of Materials
      </button>
      <button type="button" className="btn-danger" onClick={onClear} title="Remove every element">
        <Trash2 size={13} />
        Clear Canvas
      </button>

      {stale ? (
        <span className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-1 font-mono text-[9px] text-amber-300">
          UNSAVED BUDGET — RUN TEST
        </span>
      ) : null}
    </header>
  );
}

export default TopBar;
