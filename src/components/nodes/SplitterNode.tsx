import { Handle, Position, useStore, type NodeProps } from '@xyflow/react';
import { Split } from 'lucide-react';
import type { SplitterNode as SplitterFlowNode } from '../../types';
import { SPLITTER_OUTPUT_PORTS } from '../../types';
import { computeSplitterLoss } from '../../engine/opticalSimulator';
import { Badge, NodeShell, Stat } from './nodeShared';

/**
 * Passive optical splitter — 1 input, N outputs.
 * Every output carries the full catalogue + excess loss; there is no
 * "shared" penalty, which matches how a real PON budget is written.
 */
export function SplitterNode({ id, data, selected }: NodeProps<SplitterFlowNode>) {
  const portCount = SPLITTER_OUTPUT_PORTS[data.ratio];
  const lossDb = computeSplitterLoss(data);
  const activePorts = useStore((state) =>
    state.edges.reduce((count, edge) => (edge.source === id ? count + 1 : count), 0),
  );

  return (
    <div className="relative w-[224px]">
      <Handle id="in" type="target" position={Position.Left} className="!top-1/2" style={{ left: -6 }} />
      {Array.from({ length: portCount }, (_, index) => (
        <Handle
          key={`out-${index}`}
          id={`out-${index}`}
          type="source"
          position={Position.Right}
          style={{ right: -6, top: `${((index + 1) / (portCount + 1)) * 100}%` }}
        />
      ))}
      <NodeShell
        eyebrow="Passive Split"
        title={`1:${data.ratio} PLC Splitter`}
        icon={<Split size={14} />}
        accent="#a78bfa"
        selected={selected}
        ringClass="border-purple-500/40"
        footer={
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-noc-400">
              {activePorts}/{portCount} trunk{portCount === 1 ? '' : 's'} patched
            </span>
            <span className="font-mono text-[10px] font-semibold text-purple-300">
              −{lossDb.toFixed(2)} dB
            </span>
          </div>
        }
      >
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge className="border-purple-500/40 bg-purple-500/15 text-purple-200">1:{data.ratio}</Badge>
          {data.excessLossDb > 0 ? (
            <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-200">
              +{data.excessLossDb.toFixed(1)} dB excess
            </Badge>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Insertion Loss" value={`${lossDb.toFixed(2)} dB`} tone="text-purple-300" />
          <Stat label="Output Ports" value={`${portCount} × SC/APC`} />
        </div>
      </NodeShell>
    </div>
  );
}

export default SplitterNode;
