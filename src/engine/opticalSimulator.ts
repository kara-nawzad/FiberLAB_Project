import type {
  DesignSettings,
  EdgeTelemetry,
  FiberNodeData,
  LossSegment,
  NetworkSummary,
  OltNodeData,
  OntStatus,
  OntTelemetry,
  OpticalPath,
  PonEdge,
  PonNode,
  SimulationResult,
  SplitRatio,
  SplitterNodeData,
} from '../types';
import {
  ATTENUATION_DB_PER_KM,
  CONNECTOR_LOSS_DB,
  CABLE_SPECS,
  OLT_CLASS_SPECS,
  ONT_THRESHOLDS,
  SPLITTER_LOSS_DB,
  SPLICE_LOSS_DB,
} from '../types';

/* ========================================================================== *
 * Optical Simulator
 *
 * Performs a directed depth-first walk from every energised OLT transceiver,
 * accumulating loss element by element, and terminates at every ONT it can
 * reach. The link budget follows:
 *
 *   P_rx = P_tx - (L_fiber + L_splitters + L_splices + L_connectors + Margin)
 *
 * Where a subscriber is reachable by more than one OLT the best (highest
 * received power) path is kept as the primary path; all candidates are
 * retained for the inspector / BOM drill-down.
 * ========================================================================== */

const MAX_WALK_DEPTH = 96;

export const round1 = (value: number): number => Math.round(value * 10) / 10;
export const round2 = (value: number): number => Math.round(value * 100) / 100;
export const round3 = (value: number): number => Math.round(value * 1000) / 1000;

/* -------------------------------------------------------------------------- *
 * Type guards
 * -------------------------------------------------------------------------- */

export function isOltNode(node: PonNode): node is Extract<PonNode, { type: 'olt' }> {
  return node.type === 'olt';
}

export function isSplitterNode(node: PonNode): node is Extract<PonNode, { type: 'splitter' }> {
  return node.type === 'splitter';
}

export function isFiberNode(node: PonNode): node is Extract<PonNode, { type: 'fiber' }> {
  return node.type === 'fiber';
}

export function isOntNode(node: PonNode): node is Extract<PonNode, { type: 'ont' }> {
  return node.type === 'ont';
}

/* -------------------------------------------------------------------------- *
 * Elementary loss models
 * -------------------------------------------------------------------------- */

/** Effective attenuation coefficient for a fiber span, in dB/km. */
export function fiberAttenuationDbPerKm(data: FiberNodeData): number {
  if (data.attenuationOverrideDbPerKm !== null && data.attenuationOverrideDbPerKm > 0) {
    return data.attenuationOverrideDbPerKm;
  }
  return ATTENUATION_DB_PER_KM[data.wavelength];
}

export interface FiberLossBreakdown {
  cableDb: number;
  spliceDb: number;
  connectorDb: number;
  totalDb: number;
  attenuationDbPerKm: number;
}

/** Full loss model of a single cable span. */
export function computeFiberLoss(data: FiberNodeData): FiberLossBreakdown {
  const attenuationDbPerKm = fiberAttenuationDbPerKm(data);
  const cableDb = Math.max(0, data.lengthKm) * attenuationDbPerKm;
  const spliceDb = Math.max(0, data.splices) * SPLICE_LOSS_DB;
  const connectorDb = Math.max(0, data.connectors) * CONNECTOR_LOSS_DB;
  return {
    cableDb,
    spliceDb,
    connectorDb,
    totalDb: cableDb + spliceDb + connectorDb,
    attenuationDbPerKm,
  };
}

/** Catalogue + excess loss of a passive splitter. */
export function computeSplitterLoss(data: SplitterNodeData): number {
  return SPLITTER_LOSS_DB[data.ratio] + Math.max(0, data.excessLossDb);
}

/* -------------------------------------------------------------------------- *
 * Status classification — ITU-T G.984 GPON receive window
 * -------------------------------------------------------------------------- */

export function classifyOnt(rxPowerDbm: number | null): OntStatus {
  if (rxPowerDbm === null || Number.isNaN(rxPowerDbm)) return 'DISCONNECTED';
  if (rxPowerDbm > ONT_THRESHOLDS.overloadDbm) return 'OVERLOAD';
  if (rxPowerDbm >= ONT_THRESHOLDS.optimalFloorDbm) return 'ONLINE';
  if (rxPowerDbm >= ONT_THRESHOLDS.warningFloorDbm) return 'WARNING';
  return 'LOS';
}

/* -------------------------------------------------------------------------- *
 * Topology indexing
 * -------------------------------------------------------------------------- */

interface Adjacency {
  outgoing: Map<string, PonEdge[]>;
  incoming: Map<string, PonEdge[]>;
}

function buildAdjacency(edges: PonEdge[], nodeIds: Set<string>): Adjacency {
  const outgoing = new Map<string, PonEdge[]>();
  const incoming = new Map<string, PonEdge[]>();
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const out = outgoing.get(edge.source) ?? [];
    out.push(edge);
    outgoing.set(edge.source, out);
    const inc = incoming.get(edge.target) ?? [];
    inc.push(edge);
    incoming.set(edge.target, inc);
  }
  return { outgoing, incoming };
}

/* -------------------------------------------------------------------------- *
 * Main simulation
 * -------------------------------------------------------------------------- */

export function simulateTopology(
  nodes: PonNode[],
  edges: PonEdge[],
  settings: DesignSettings,
  runId = 0,
): SimulationResult {
  const nodeById = new Map<string, PonNode>();
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    nodeById.set(node.id, node);
    nodeIds.add(node.id);
  }

  const { outgoing } = buildAdjacency(edges, nodeIds);

  const candidatesByOnt = new Map<string, OpticalPath[]>();
  const edgeBest = new Map<string, number>();
  const safetyMarginDb = Math.max(0, settings.safetyMarginDb);

  interface WalkState {
    lossDb: number;
    segments: LossSegment[];
    onStack: Set<string>;
    fiberKm: number;
    splitStages: number;
    cumulativeSplitRatio: number;
    splices: number;
    connectors: number;
  }

  const emptyState = (): WalkState => ({
    lossDb: 0,
    segments: [],
    onStack: new Set<string>(),
    fiberKm: 0,
    splitStages: 0,
    cumulativeSplitRatio: 1,
    splices: 0,
    connectors: 0,
  });

  const recordEdge = (edgeId: string, powerDbm: number): void => {
    const existing = edgeBest.get(edgeId);
    if (existing === undefined || powerDbm > existing) edgeBest.set(edgeId, powerDbm);
  };

  const walk = (
    olt: Extract<PonNode, { type: 'olt' }>,
    oltData: OltNodeData,
    nodeId: string,
    state: WalkState,
    visitedEdges: string[],
  ): void => {
    if (state.onStack.size > MAX_WALK_DEPTH) return;

    const node = nodeById.get(nodeId);
    if (!node) return;

    // Optical power arriving at this element's input port, before its own loss.
    // Recorded first so the final hop into an ONT is metered like every other.
    const incomingEdgeId = visitedEdges[visitedEdges.length - 1];
    if (incomingEdgeId !== undefined) {
      recordEdge(incomingEdgeId, oltData.txPowerDbm - state.lossDb);
    }

    // Terminal: a subscriber endpoint. Emit a completed optical path.
    if (isOntNode(node)) {
      const rxPowerDbm = oltData.txPowerDbm - state.lossDb - safetyMarginDb;
      const path: OpticalPath = {
        oltId: olt.id,
        oltPort: oltData.portName,
        nodeIds: [...state.onStack, node.id],
        txPowerDbm: oltData.txPowerDbm,
        totalLossDb: state.lossDb + safetyMarginDb,
        rxPowerDbm,
        segments: [
          ...state.segments,
          {
            nodeId: null,
            component: 'margin',
            label: 'System safety margin',
            lossDb: safetyMarginDb,
          },
        ],
        fiberKm: state.fiberKm,
        splitStages: state.splitStages,
        cumulativeSplitRatio: state.cumulativeSplitRatio,
        splices: state.splices,
        connectors: state.connectors,
        wavelength: oltData.wavelength,
      };
      const bucket = candidatesByOnt.get(node.id) ?? [];
      bucket.push(path);
      candidatesByOnt.set(node.id, bucket);
      return;
    }

    // Terminal: another OLT cannot be traversed through.
    if (isOltNode(node)) return;

    const nextState: WalkState = {
      lossDb: state.lossDb,
      segments: [...state.segments],
      onStack: new Set(state.onStack),
      fiberKm: state.fiberKm,
      splitStages: state.splitStages,
      cumulativeSplitRatio: state.cumulativeSplitRatio,
      splices: state.splices,
      connectors: state.connectors,
    };
    nextState.onStack.add(node.id);

    if (isFiberNode(node)) {
      const loss = computeFiberLoss(node.data);
      nextState.lossDb += loss.totalDb;
      nextState.fiberKm += Math.max(0, node.data.lengthKm);
      nextState.splices += Math.max(0, node.data.splices);
      nextState.connectors += Math.max(0, node.data.connectors);
      nextState.segments.push({
        nodeId: node.id,
        component: 'fiber',
        label: `${CABLE_SPECS[node.data.cableType].label} — ${round3(node.data.lengthKm)} km @ ${round2(
          loss.attenuationDbPerKm,
        )} dB/km`,
        lossDb: loss.cableDb,
      });
      if (loss.spliceDb > 0) {
        nextState.segments.push({
          nodeId: node.id,
          component: 'splice',
          label: `${node.data.splices} fusion splice${node.data.splices === 1 ? '' : 's'} @ ${SPLICE_LOSS_DB} dB`,
          lossDb: loss.spliceDb,
        });
      }
      if (loss.connectorDb > 0) {
        nextState.segments.push({
          nodeId: node.id,
          component: 'connector',
          label: `${node.data.connectors} SC/APC connector${node.data.connectors === 1 ? '' : 's'} @ ${CONNECTOR_LOSS_DB} dB`,
          lossDb: loss.connectorDb,
        });
      }
    } else if (isSplitterNode(node)) {
      const splitterLoss = computeSplitterLoss(node.data);
      nextState.lossDb += splitterLoss;
      nextState.splitStages += 1;
      nextState.cumulativeSplitRatio *= node.data.ratio;
      nextState.segments.push({
        nodeId: node.id,
        component: 'splitter',
        label: `1:${node.data.ratio} splitter${
          node.data.excessLossDb > 0 ? ` (+${round2(node.data.excessLossDb)} dB excess)` : ''
        }`,
        lossDb: splitterLoss,
      });
    }

    for (const edge of outgoing.get(node.id) ?? []) {
      if (nextState.onStack.has(edge.target)) continue; // loop guard
      walk(olt, oltData, edge.target, nextState, [...visitedEdges, edge.id]);
    }
  };

  // Energise every OLT with its laser enabled.
  for (const node of nodes) {
    if (!isOltNode(node)) continue;
    const data = node.data;
    if (!data.laserOn) continue;

    for (const edge of outgoing.get(node.id) ?? []) {
      const state = emptyState();
      state.onStack.add(node.id);
      walk(node, data, edge.target, state, [edge.id]);
    }
  }

  /* -------------------------- Assemble ONT telemetry ---------------------- */

  const ontTelemetry: Record<string, OntTelemetry> = {};
  const bestPaths: Record<string, OpticalPath> = {};

  for (const node of nodes) {
    if (!isOntNode(node)) continue;
    const candidates = [...(candidatesByOnt.get(node.id) ?? [])].sort(
      (a, b) => b.rxPowerDbm - a.rxPowerDbm,
    );
    const best = candidates[0];
    const rxPowerDbm = best ? round2(best.rxPowerDbm) : null;
    const status = classifyOnt(rxPowerDbm);

    ontTelemetry[node.id] = {
      ontId: node.id,
      status,
      rxPowerDbm,
      totalLossDb: best ? round2(best.totalLossDb) : 0,
      marginDb: rxPowerDbm === null ? 0 : round2(rxPowerDbm - ONT_THRESHOLDS.losFloorDbm),
      headroomDb: rxPowerDbm === null ? 0 : round2(ONT_THRESHOLDS.overloadDbm - rxPowerDbm),
      sourceOltId: best ? best.oltId : null,
      fiberKm: best ? round3(best.fiberKm) : 0,
      splitStages: best ? best.splitStages : 0,
      cumulativeSplitRatio: best ? best.cumulativeSplitRatio : 1,
      splices: best ? best.splices : 0,
      connectors: best ? best.connectors : 0,
      segments: best ? best.segments : [],
      candidatePaths: candidates,
    };

    if (best) bestPaths[node.id] = best;
  }

  /* --------------------------- Edge telemetry ---------------------------- */

  const edgeTelemetry: Record<string, EdgeTelemetry> = {};
  for (const edge of edges) {
    const powerDbm = edgeBest.get(edge.id);
    const value = powerDbm === undefined ? null : round2(powerDbm);
    let edgeState: EdgeTelemetry['edgeState'] = 'idle';
    if (value !== null) {
      edgeState = value < ONT_THRESHOLDS.losFloorDbm ? 'degraded' : 'live';
    }
    edgeTelemetry[edge.id] = { powerDbm: value, edgeState };
  }

  /* ------------------------------ Summary -------------------------------- */

  const summary = summarise(nodes, ontTelemetry);

  return {
    ontTelemetry,
    bestPaths,
    edgeTelemetry,
    summary,
    runId,
    safetyMarginDb,
    computedAt: Date.now(),
  };
}

function summarise(
  nodes: PonNode[],
  ontTelemetry: Record<string, OntTelemetry>,
): NetworkSummary {
  const byStatus: Record<OntStatus, number> = {
    OVERLOAD: 0,
    ONLINE: 0,
    WARNING: 0,
    LOS: 0,
    DISCONNECTED: 0,
  };

  let ontCount = 0;
  let rxSum = 0;
  let rxCount = 0;
  let worstRxDbm: number | null = null;

  for (const telemetry of Object.values(ontTelemetry)) {
    ontCount += 1;
    byStatus[telemetry.status] += 1;
    if (telemetry.rxPowerDbm !== null) {
      rxSum += telemetry.rxPowerDbm;
      rxCount += 1;
      if (worstRxDbm === null || telemetry.rxPowerDbm < worstRxDbm) {
        worstRxDbm = telemetry.rxPowerDbm;
      }
    }
  }

  let totalFiberKm = 0;
  let totalSplices = 0;
  let totalConnectors = 0;
  let splitterTotal = 0;
  let oltCount = 0;
  let oltActive = 0;
  const splitterCountByRatio: Partial<Record<SplitRatio, number>> = {};

  for (const node of nodes) {
    if (isFiberNode(node)) {
      totalFiberKm += Math.max(0, node.data.lengthKm);
      totalSplices += Math.max(0, node.data.splices);
      totalConnectors += Math.max(0, node.data.connectors);
    } else if (isSplitterNode(node)) {
      splitterTotal += 1;
      splitterCountByRatio[node.data.ratio] = (splitterCountByRatio[node.data.ratio] ?? 0) + 1;
    } else if (isOltNode(node)) {
      oltCount += 1;
      if (node.data.laserOn) oltActive += 1;
    }
  }

  const liveCount = byStatus.ONLINE + byStatus.WARNING + byStatus.OVERLOAD + byStatus.LOS;

  return {
    ontCount,
    byStatus,
    totalFiberKm: round3(totalFiberKm),
    totalSplices,
    totalConnectors,
    splitterCountByRatio,
    splitterTotal,
    oltCount,
    oltActive,
    meanRxDbm: rxCount > 0 ? round2(rxSum / rxCount) : null,
    worstRxDbm,
    allOptimal: ontCount > 0 && byStatus.ONLINE === ontCount,
    hasFault: byStatus.LOS > 0 || byStatus.DISCONNECTED > 0 || (ontCount > 0 && liveCount < ontCount),
  };
}

/* -------------------------------------------------------------------------- *
 * Presentation helpers
 * -------------------------------------------------------------------------- */

export const formatDbm = (value: number | null): string =>
  value === null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)} dBm`;

export const formatDb = (value: number): string => `${value.toFixed(2)} dB`;

export function describeStatus(status: OntStatus): string {
  switch (status) {
    case 'OVERLOAD':
      return 'Optical saturation / burn risk';
    case 'ONLINE':
      return 'Within GPON optimal window';
    case 'WARNING':
      return 'Marginal — high BER risk';
    case 'LOS':
      return 'Loss of signal';
    case 'DISCONNECTED':
      return 'No active OLT path';
    default:
      return 'Unknown';
  }
}

/** Nominal link budget of an OLT class, for the inspector's headroom gauge. */
export function classLinkBudget(oltClass: keyof typeof OLT_CLASS_SPECS): number {
  return OLT_CLASS_SPECS[oltClass].linkBudgetDb;
}
