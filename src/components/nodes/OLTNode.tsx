import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Power, PowerOff, Radio } from 'lucide-react';
import type { OltNode as OltFlowNode } from '../../types';
import { OLT_CLASS_SPECS } from '../../types';
import { Badge, NodeShell, Stat } from './nodeShared';

/**
 * OLT transceiver — the light source of the PON.
 * Displays launch power, PON port identity, wavelength and laser state.
 */
export function OLTNode({ data, selected }: NodeProps<OltFlowNode>) {
  const spec = OLT_CLASS_SPECS[data.oltClass];
  const accent = data.laserOn ? '#38bdf8' : '#5d6c8f';

  return (
    <div className="relative w-[236px]">
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        className="!top-1/2"
        style={{ right: -6 }}
      />
      <NodeShell
        eyebrow="Headend"
        title={data.portName}
        icon={<Radio size={14} />}
        accent={accent}
        selected={selected}
        ringClass={data.laserOn ? 'border-sky-500/50' : 'border-noc-600'}
        footer={
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${
                data.laserOn ? 'text-emerald-300' : 'text-noc-400'
              }`}
            >
              {data.laserOn ? <Power size={11} /> : <PowerOff size={11} />}
              Laser {data.laserOn ? 'On' : 'Off'}
            </span>
            <span className="font-mono text-[10px] text-noc-400">{data.wavelength} nm</span>
          </div>
        }
      >
        <div className="mb-2 flex items-center gap-1.5">
          <Badge className="border-sky-500/40 bg-sky-500/15 text-sky-200">Class {data.oltClass}</Badge>
          <span className="truncate text-[10px] text-noc-400">budget {spec.linkBudgetDb.toFixed(0)} dB</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Stat
            label="Tx Power"
            value={`${data.txPowerDbm >= 0 ? '+' : ''}${data.txPowerDbm.toFixed(1)} dBm`}
            tone={data.laserOn ? 'text-sky-300' : 'text-noc-400'}
          />
          <Stat label="Rx Sens." value={`${spec.rxSensitivityDbm.toFixed(0)} dBm`} />
        </div>
      </NodeShell>
    </div>
  );
}

export default OLTNode;
