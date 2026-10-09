import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Router, WifiOff } from 'lucide-react';
import type { OntNode as OntFlowNode, OntStatus } from '../../types';
import { STATUS_STYLES } from '../../types';
import { describeStatus } from '../../engine/opticalSimulator';
import { useSimulation } from '../../engine/SimulationContext';
import { Badge, Led, NodeShell, Stat } from './nodeShared';

/* Meter scale: -35 dBm (left) .. -5 dBm (right) */
const METER_MIN = -35;
const METER_MAX = -5;
const METER_SPAN = METER_MAX - METER_MIN;

const toPercent = (value: number): number =>
  Math.max(0, Math.min(100, ((value - METER_MIN) / METER_SPAN) * 100));

const ZONES: Array<{ from: number; to: number; color: string }> = [
  { from: -35, to: -28, color: 'rgba(240,84,79,0.55)' },
  { from: -28, to: -24, color: 'rgba(245,181,68,0.55)' },
  { from: -24, to: -8, color: 'rgba(34,211,131,0.55)' },
  { from: -8, to: -5, color: 'rgba(167,139,250,0.55)' },
];

/**
 * ONT / ONU subscriber endpoint — reads live received power from the
 * simulation context and classifies it against the GPON receive window.
 */
export function ONTNode({ id, data, selected }: NodeProps<OntFlowNode>) {
  const simulation = useSimulation();
  const telemetry = simulation?.ontTelemetry[id];
  const status: OntStatus = telemetry?.status ?? 'DISCONNECTED';
  const style = STATUS_STYLES[status];
  const rx = telemetry?.rxPowerDbm ?? null;

  return (
    <div className="relative w-[252px]">
      <Handle id="in" type="target" position={Position.Left} className="!top-1/2" style={{ left: -6 }} />
      <NodeShell
        eyebrow="Subscriber"
        title={data.subscriber}
        icon={rx === null ? <WifiOff size={14} /> : <Router size={14} />}
        accent={style.hex}
        selected={selected}
        ringClass={style.ring}
        footer={
          <div className="flex items-center justify-between">
            <span className="truncate font-mono text-[10px] text-noc-400">{data.serial}</span>
            <span className="font-mono text-[10px] text-noc-400">
              {telemetry ? `${telemetry.fiberKm.toFixed(2)} km · 1:${telemetry.cumulativeSplitRatio}` : '—'}
            </span>
          </div>
        }
      >
        <div className="mb-2 flex items-center gap-2">
          <Led color={style.hex} pulse={status === 'ONLINE' || status === 'LOS'} size={10} />
          <Badge className={style.badge}>{style.label}</Badge>
          <span className="ml-auto font-mono text-[16px] font-bold leading-none" style={{ color: style.hex }}>
            {rx === null ? '—' : `${rx >= 0 ? '+' : ''}${rx.toFixed(2)}`}
          </span>
          <span className="font-mono text-[10px] text-noc-400">dBm</span>
        </div>

        <div
          className="relative h-2 w-full overflow-hidden rounded-full border border-noc-700/70"
          title={`Receive window ${METER_MIN} … ${METER_MAX} dBm`}
        >
          {ZONES.map((zone) => (
            <span
              key={`${zone.from}-${zone.to}`}
              className="absolute inset-y-0"
              style={{
                left: `${toPercent(zone.from)}%`,
                width: `${toPercent(zone.to) - toPercent(zone.from)}%`,
                background: zone.color,
              }}
            />
          ))}
          {rx !== null ? (
            <span
              className="absolute inset-y-0 w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
              style={{ left: `calc(${toPercent(rx)}% - 1.5px)` }}
            />
          ) : null}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[9px] text-noc-500">
          <span>{METER_MIN}</span>
          <span>−28</span>
          <span>−24</span>
          <span>−8</span>
          <span>{METER_MAX}</span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Stat
            label="Link Margin"
            value={rx === null ? '—' : `${telemetry?.marginDb.toFixed(2)} dB`}
            tone={
              rx === null
                ? 'text-noc-400'
                : (telemetry?.marginDb ?? 0) > 4
                  ? 'text-emerald-300'
                  : (telemetry?.marginDb ?? 0) > 0
                    ? 'text-amber-300'
                    : 'text-red-300'
            }
          />
          <Stat label="Path Loss" value={rx === null ? '—' : `${telemetry?.totalLossDb.toFixed(2)} dB`} />
        </div>
        <div className="mt-1.5 text-[10px] leading-tight text-noc-400">{describeStatus(status)}</div>
      </NodeShell>
    </div>
  );
}

export default ONTNode;
