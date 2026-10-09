import { useState, type DragEvent } from 'react';
import {
  Cable,
  Radio,
  Router,
  Split,
} from 'lucide-react';
import type { CableType, SplitRatio } from '../types';
import { ATTENUATION_DB_PER_KM, CABLE_SPECS, SPLIT_RATIOS, SPLITTER_LOSS_DB } from '../types';

/* ========================================================================== *
 * Component toolbox — HTML5 drag source for every PON element.
 * ========================================================================== */

export const DND_MIME = 'application/x-ftth-component';

export interface ToolboxPayload {
  component: 'olt' | 'splitter' | 'fiber' | 'ont';
  ratio?: SplitRatio;
  cableType?: CableType;
}

interface SidebarProps {
  onQuickAdd: (payload: ToolboxPayload) => void;
}

function startDrag(event: DragEvent<HTMLButtonElement>, payload: ToolboxPayload) {
  event.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
  // Firefox also needs a plain-text flavour to start the drag.
  event.dataTransfer.setData('text/plain', JSON.stringify(payload));
  event.dataTransfer.effectAllowed = 'move';
}

interface ToolItemProps {
  icon: React.ReactNode;
  accent: string;
  title: string;
  subtitle: string;
  payload: ToolboxPayload;
  onQuickAdd: (payload: ToolboxPayload) => void;
}

function ToolItem({ icon, accent, title, subtitle, payload, onQuickAdd }: ToolItemProps) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => startDrag(event, payload)}
      onDoubleClick={() => onQuickAdd(payload)}
      title={`${title} — drag onto the canvas, or double-click to place`}
      className="tool-card group w-full"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ background: `${accent}22`, color: accent }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-semibold text-noc-200">{title}</span>
        <span className="block truncate text-[10px] text-noc-400">{subtitle}</span>
      </span>
      <span className="text-noc-500 opacity-0 transition-opacity group-hover:opacity-100">⠿</span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow mb-1.5 mt-3 first:mt-0">{children}</div>;
}

export function Sidebar({ onQuickAdd }: SidebarProps) {
  const [ratioDraft, setRatioDraft] = useState<SplitRatio>(8);
  const [cableDraft, setCableDraft] = useState<CableType>('distribution');

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-noc-700/70 bg-noc-900/70">
      <div className="panel-header">
        <div>
          <div className="text-[13px] font-semibold text-noc-200">Component Toolbox</div>
          <div className="text-[10px] text-noc-400">Drag onto the canvas</div>
        </div>
        <span className="rounded border border-noc-600 px-1.5 py-0.5 font-mono text-[9px] text-noc-400">
          4 TYPES
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <SectionLabel>Headend</SectionLabel>
        <ToolItem
          icon={<Radio size={16} />}
          accent="#38bdf8"
          title="OLT Transceiver"
          subtitle="Class B+ / C+ · +3.0 dBm default"
          payload={{ component: 'olt' }}
          onQuickAdd={onQuickAdd}
        />

        <SectionLabel>Passive Splitting</SectionLabel>
        <div className="mb-2 flex items-center gap-1.5">
          <label htmlFor="toolbox-ratio" className="text-[10px] text-noc-400">
            Ratio
          </label>
          <select
            id="toolbox-ratio"
            className="select flex-1 !py-1 !text-[11px]"
            value={ratioDraft}
            onChange={(event) => setRatioDraft(Number(event.target.value) as SplitRatio)}
          >
            {SPLIT_RATIOS.map((ratio) => (
              <option key={ratio} value={ratio}>
                1:{ratio} — {SPLITTER_LOSS_DB[ratio].toFixed(1)} dB
              </option>
            ))}
          </select>
        </div>
        <ToolItem
          icon={<Split size={16} />}
          accent="#a78bfa"
          title={`PLC Splitter 1:${ratioDraft}`}
          subtitle={`${SPLITTER_LOSS_DB[ratioDraft].toFixed(1)} dB insertion loss`}
          payload={{ component: 'splitter', ratio: ratioDraft }}
          onQuickAdd={onQuickAdd}
        />
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {([2, 4, 8, 16, 32, 64] as SplitRatio[]).map((ratio) => (
            <button
              key={ratio}
              type="button"
              draggable
              onDragStart={(event) => startDrag(event, { component: 'splitter', ratio })}
              onClick={() => onQuickAdd({ component: 'splitter', ratio })}
              className={`rounded border py-1 font-mono text-[10px] transition-colors ${
                ratioDraft === ratio
                  ? 'border-purple-400/70 bg-purple-500/20 text-purple-200'
                  : 'border-noc-700/70 bg-noc-850/70 text-noc-300 hover:border-purple-400/40'
              }`}
            >
              1:{ratio}
            </button>
          ))}
        </div>

        <SectionLabel>Fiber Plant</SectionLabel>
        <div className="mb-2 flex items-center gap-1.5">
          <label htmlFor="toolbox-cable" className="text-[10px] text-noc-400">
            Type
          </label>
          <select
            id="toolbox-cable"
            className="select flex-1 !py-1 !text-[11px]"
            value={cableDraft}
            onChange={(event) => setCableDraft(event.target.value as CableType)}
          >
            {(Object.keys(CABLE_SPECS) as CableType[]).map((cable) => (
              <option key={cable} value={cable}>
                {CABLE_SPECS[cable].label} ({CABLE_SPECS[cable].defaultLengthKm} km)
              </option>
            ))}
          </select>
        </div>
        <ToolItem
          icon={<Cable size={16} />}
          accent={CABLE_SPECS[cableDraft].accent}
          title={`${CABLE_SPECS[cableDraft].label} span`}
          subtitle={`${CABLE_SPECS[cableDraft].defaultLengthKm} km · ${CABLE_SPECS[cableDraft].defaultSplices} splice · ${CABLE_SPECS[cableDraft].defaultConnectors} conn`}
          payload={{ component: 'fiber', cableType: cableDraft }}
          onQuickAdd={onQuickAdd}
        />
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {(Object.keys(CABLE_SPECS) as CableType[]).map((cable) => (
            <button
              key={cable}
              type="button"
              draggable
              onDragStart={(event) => startDrag(event, { component: 'fiber', cableType: cable })}
              onClick={() => onQuickAdd({ component: 'fiber', cableType: cable })}
              className="rounded border border-noc-700/70 bg-noc-850/70 py-1 font-mono text-[10px] text-noc-300 transition-colors hover:border-sky-400/50"
              style={{ color: CABLE_SPECS[cable].accent }}
            >
              {CABLE_SPECS[cable].short}
            </button>
          ))}
        </div>

        <SectionLabel>Premises</SectionLabel>
        <ToolItem
          icon={<Router size={16} />}
          accent="#22d383"
          title="ONT / ONU"
          subtitle="Subscriber endpoint · −28 dBm sensitivity"
          payload={{ component: 'ont' }}
          onQuickAdd={onQuickAdd}
        />

        <SectionLabel>Reference</SectionLabel>
        <div className="rounded-lg border border-noc-700/60 bg-noc-950/50 p-2">
          <table className="w-full font-mono text-[10px] text-noc-300">
            <tbody>
              <tr className="text-noc-500">
                <td className="py-0.5">λ</td>
                <td className="py-0.5 text-right">dB/km</td>
              </tr>
              <tr>
                <td className="py-0.5">1310 nm</td>
                <td className="py-0.5 text-right text-sky-300">
                  {ATTENUATION_DB_PER_KM[1310].toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">1490 nm</td>
                <td className="py-0.5 text-right text-emerald-300">
                  {ATTENUATION_DB_PER_KM[1490].toFixed(2)}
                </td>
              </tr>
              <tr className="border-t border-noc-700/60 text-noc-500">
                <td className="py-0.5">fusion splice</td>
                <td className="py-0.5 text-right">0.10 dB</td>
              </tr>
              <tr className="text-noc-500">
                <td className="py-0.5">SC/APC</td>
                <td className="py-0.5 text-right">0.50 dB</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-noc-500">
          Drag a handle from one element to another to patch them. Every drop cable, splice and
          connector you add is counted in the live link budget.
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
