import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { PonEdge } from '../types';
import { EDGE_STROKE } from '../engine/edgeDecoration';

/**
 * Optical patch edge. Colour encodes the state of the light travelling it:
 *   green  — live, above receiver sensitivity
 *   red    — light present but below sensitivity (LOS territory)
 *   grey   — idle, no energised OLT path
 */

export function OpticalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<PonEdge>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.28,
  });

  const state = data?.edgeState ?? 'idle';
  const powerDbm = data?.powerDbm ?? null;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={`optical-edge is-${state}`}
        style={{
          stroke: EDGE_STROKE[state],
          strokeWidth: selected ? 3.5 : 2.25,
          opacity: selected ? 1 : 0.92,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="pointer-events-none absolute rounded border border-noc-700/80 bg-noc-950/90 px-1 py-[1px] font-mono text-[9px] text-noc-300"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            opacity: powerDbm === null ? 0.55 : 1,
            borderColor: powerDbm === null ? undefined : `${EDGE_STROKE[state]}66`,
          }}
        >
          {powerDbm === null ? 'idle' : `${powerDbm >= 0 ? '+' : ''}${powerDbm.toFixed(1)} dBm`}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default OpticalEdge;
