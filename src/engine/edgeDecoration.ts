import { MarkerType } from '@xyflow/react';
import type { EdgeTelemetry, FiberEdgeData, PonEdge } from '../types';

/* ========================================================================== *
 * Edge presentation — turns simulator telemetry into React Flow edge props.
 * Kept out of the physics engine so the engine stays environment-free and
 * directly unit-testable.
 * ========================================================================== */

/** Stroke colour per optical edge state — shared by the edge renderer. */
export const EDGE_STROKE: Record<EdgeTelemetry['edgeState'], string> = {
  live: '#22d383',
  degraded: '#f0544f',
  idle: '#4b5568',
};

/** Applies the simulator's edge telemetry onto React Flow edges. */
export function decorateEdges(
  edges: PonEdge[],
  telemetry: Record<string, EdgeTelemetry>,
): PonEdge[] {
  return edges.map((edge) => {
    const reading: EdgeTelemetry = telemetry[edge.id] ?? { powerDbm: null, edgeState: 'idle' };
    const data: FiberEdgeData = {
      powerDbm: reading.powerDbm,
      edgeState: reading.edgeState,
    };
    return {
      ...edge,
      data,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
        color: EDGE_STROKE[reading.edgeState],
      },
    };
  });
}
