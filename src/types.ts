import type { Edge, Node } from '@xyflow/react';

/* ========================================================================== *
 * FTTH-Studio — Domain Model
 *
 * Every optical element in the PON is modelled as a React Flow node. Fiber
 * runs are first-class nodes (not edges) so that a physical cable span carries
 * its own length, splice count, connector count and wavelength — the edges
 * between elements are purely patch-cord / patch-panel relationships.
 * ========================================================================== */

/** Downstream (1490 nm) carries the OLT -> ONT data we budget for.
 *  Upstream (1310 nm) is the ONT -> OLT return path, which is weaker. */
export type Wavelength = 1310 | 1490;

/** Attenuation coefficient per wavelength in dB/km (ITU-T G.652.D single mode). */
export const ATTENUATION_DB_PER_KM: Record<Wavelength, number> = {
  1310: 0.35,
  1490: 0.25,
};

export const WAVELENGTH_LABEL: Record<Wavelength, string> = {
  1310: '1310 nm (upstream)',
  1490: '1490 nm (downstream)',
};

/* -------------------------------------------------------------------------- *
 * Passive splitter catalogue
 * -------------------------------------------------------------------------- */

export type SplitRatio = 2 | 4 | 8 | 16 | 32 | 64;

/** Theoretical splitting loss + typical insertion loss, in dB. */
export const SPLITTER_LOSS_DB: Record<SplitRatio, number> = {
  2: 3.7,
  4: 7.2,
  8: 10.5,
  16: 13.8,
  32: 17.5,
  64: 20.8,
};

export const SPLIT_RATIOS: SplitRatio[] = [2, 4, 8, 16, 32, 64];

/** Physical output port count exposed on the splitter node. */
export const SPLITTER_OUTPUT_PORTS: Record<SplitRatio, number> = {
  2: 2,
  4: 4,
  8: 4,
  16: 4,
  32: 4,
  64: 4,
};

/* -------------------------------------------------------------------------- *
 * OLT transceiver classes (ITU-T G.984.2 power budgets)
 * -------------------------------------------------------------------------- */

export type OltClass = 'B+' | 'C+';

export interface OltClassSpec {
  label: string;
  /** Typical launch power used as the default when the class is selected. */
  txPowerDbm: number;
  minTxDbm: number;
  maxTxDbm: number;
  /** Receiver sensitivity of the OLT side, informational only. */
  rxSensitivityDbm: number;
  /** Nominal link budget advertised by the class. */
  linkBudgetDb: number;
}

export const OLT_CLASS_SPECS: Record<OltClass, OltClassSpec> = {
  'B+': {
    label: 'Class B+ (GPON)',
    txPowerDbm: 3.0,
    minTxDbm: 1.5,
    maxTxDbm: 5.0,
    rxSensitivityDbm: -28.0,
    linkBudgetDb: 28.0,
  },
  'C+': {
    label: 'Class C+ (GPON/XGS)',
    txPowerDbm: 5.0,
    minTxDbm: 3.0,
    maxTxDbm: 7.0,
    rxSensitivityDbm: -32.0,
    linkBudgetDb: 32.0,
  },
};

/* -------------------------------------------------------------------------- *
 * Fiber cable presets
 * -------------------------------------------------------------------------- */

export type CableType = 'feeder' | 'distribution' | 'drop';

export interface CableSpec {
  label: string;
  short: string;
  defaultLengthKm: number;
  defaultSplices: number;
  defaultConnectors: number;
  accent: string;
}

export const CABLE_SPECS: Record<CableType, CableSpec> = {
  feeder: {
    label: 'Feeder cable',
    short: 'FEEDER',
    defaultLengthKm: 5,
    defaultSplices: 0,
    defaultConnectors: 2,
    accent: '#38bdf8',
  },
  distribution: {
    label: 'Distribution cable',
    short: 'DISTRIB',
    defaultLengthKm: 1,
    defaultSplices: 2,
    defaultConnectors: 2,
    accent: '#22d383',
  },
  drop: {
    label: 'Drop cable',
    short: 'DROP',
    defaultLengthKm: 0.3,
    defaultSplices: 1,
    defaultConnectors: 2,
    accent: '#f5b544',
  },
};

/* -------------------------------------------------------------------------- *
 * Per-element loss standards
 * -------------------------------------------------------------------------- */

/** Fusion splice, per ITU-T practice. */
export const SPLICE_LOSS_DB = 0.1;

/** SC/APC connector pair member loss. */
export const CONNECTOR_LOSS_DB = 0.5;

/** Default system / ageing / repair allowance. */
export const DEFAULT_SAFETY_MARGIN_DB = 2.0;

/* -------------------------------------------------------------------------- *
 * ONT status classification (ITU-T G.984 GPON)
 * -------------------------------------------------------------------------- */

export type OntStatus = 'OVERLOAD' | 'ONLINE' | 'WARNING' | 'LOS' | 'DISCONNECTED';

export interface OntThresholds {
  /** Above this the receiver saturates / risks damage. */
  overloadDbm: number;
  /** Best achievable sensitivity for the ONT class. */
  optimalFloorDbm: number;
  /** Below this the link is marginal (high BER). */
  warningFloorDbm: number;
  /** Below this there is loss of signal. */
  losFloorDbm: number;
}

export const ONT_THRESHOLDS: OntThresholds = {
  overloadDbm: -8.0,
  optimalFloorDbm: -24.0,
  warningFloorDbm: -28.0,
  losFloorDbm: -28.0,
};

export interface StatusStyle {
  label: string;
  /** Badge / LED colour. */
  hex: string;
  /** Tailwind utility classes for badges. */
  badge: string;
  /** Tailwind utility classes for the node ring. */
  ring: string;
  /** Description shown in the inspector + BOM. */
  blurb: string;
}

export const STATUS_STYLES: Record<OntStatus, StatusStyle> = {
  OVERLOAD: {
    label: 'OVERLOAD',
    hex: '#a78bfa',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    ring: 'border-purple-500/70 shadow-[0_0_28px_-6px_rgba(167,139,250,0.75)]',
    blurb: 'Receiver saturation — optical burn risk. Add attenuation.',
  },
  ONLINE: {
    label: 'ONLINE',
    hex: '#22d383',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    ring: 'border-emerald-500/70 shadow-[0_0_28px_-6px_rgba(34,211,131,0.7)]',
    blurb: 'Within the GPON optimal receive window.',
  },
  WARNING: {
    label: 'WARNING',
    hex: '#f5b544',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    ring: 'border-amber-500/70 shadow-[0_0_28px_-6px_rgba(245,181,68,0.7)]',
    blurb: 'Marginal link — high BER risk, service will degrade.',
  },
  LOS: {
    label: 'LOS',
    hex: '#f0544f',
    badge: 'bg-red-500/15 text-red-300 border-red-500/40',
    ring: 'border-red-500/70 shadow-[0_0_28px_-6px_rgba(240,84,79,0.7)]',
    blurb: 'Loss of signal — received power below receiver sensitivity.',
  },
  DISCONNECTED: {
    label: 'DISCONNECTED',
    hex: '#8c9ab8',
    badge: 'bg-noc-700/60 text-noc-300 border-noc-500/50',
    ring: 'border-noc-600',
    blurb: 'No active OLT path reaches this ONT.',
  },
};

/* -------------------------------------------------------------------------- *
 * Node data payloads
 * -------------------------------------------------------------------------- */

export type ComponentKind = 'olt' | 'splitter' | 'fiber' | 'ont';

export interface OltNodeData extends Record<string, unknown> {
  kind: 'olt';
  portName: string;
  oltClass: OltClass;
  txPowerDbm: number;
  laserOn: boolean;
  wavelength: Wavelength;
}

export interface SplitterNodeData extends Record<string, unknown> {
  kind: 'splitter';
  ratio: SplitRatio;
  /** Extra non-ideal loss on top of the catalogue value (uniformity/wavelength). */
  excessLossDb: number;
}

export interface FiberNodeData extends Record<string, unknown> {
  kind: 'fiber';
  cableType: CableType;
  lengthKm: number;
  splices: number;
  connectors: number;
  wavelength: Wavelength;
  /** Manual override of the attenuation coefficient; when set it wins over wavelength. */
  attenuationOverrideDbPerKm: number | null;
}

export interface OntNodeData extends Record<string, unknown> {
  kind: 'ont';
  serial: string;
  subscriber: string;
  /** Receive sensitivity of the installed ONT (informational, thresholds are global). */
  sensitivityDbm: number;
}

export type AnyNodeData = OltNodeData | SplitterNodeData | FiberNodeData | OntNodeData;

export type OltNode = Node<OltNodeData, 'olt'>;
export type SplitterNode = Node<SplitterNodeData, 'splitter'>;
export type FiberNode = Node<FiberNodeData, 'fiber'>;
export type OntNode = Node<OntNodeData, 'ont'>;
export type PonNode = OltNode | SplitterNode | FiberNode | OntNode;

/** Edge payload — carries the optical state produced by the simulator. */
export interface FiberEdgeData extends Record<string, unknown> {
  /** Optical power at the far end of this edge, dBm. `null` when no light flows. */
  powerDbm: number | null;
  edgeState: EdgeState;
}

export type EdgeState = 'live' | 'degraded' | 'idle';

export type PonEdge = Edge<FiberEdgeData>;

/* -------------------------------------------------------------------------- *
 * Simulation telemetry
 * -------------------------------------------------------------------------- */

export interface LossSegment {
  nodeId: string | null;
  component: 'fiber' | 'splitter' | 'splice' | 'connector' | 'margin' | 'olt';
  label: string;
  lossDb: number;
}

export interface OpticalPath {
  oltId: string;
  oltPort: string;
  /** Ordered node ids from the OLT to the ONT (inclusive). */
  nodeIds: string[];
  txPowerDbm: number;
  totalLossDb: number;
  rxPowerDbm: number;
  segments: LossSegment[];
  fiberKm: number;
  splitStages: number;
  cumulativeSplitRatio: number;
  splices: number;
  connectors: number;
  wavelength: Wavelength;
}

export interface OntTelemetry {
  ontId: string;
  status: OntStatus;
  rxPowerDbm: number | null;
  totalLossDb: number;
  /** Distance from the ONT's worst acceptable floor (-28 dBm). */
  marginDb: number;
  /** Distance from the overload ceiling (-8 dBm). */
  headroomDb: number;
  sourceOltId: string | null;
  fiberKm: number;
  splitStages: number;
  cumulativeSplitRatio: number;
  splices: number;
  connectors: number;
  segments: LossSegment[];
  /** Every OLT path that reaches this ONT, best first. */
  candidatePaths: OpticalPath[];
}

export interface EdgeTelemetry {
  powerDbm: number | null;
  edgeState: EdgeState;
}

export interface NetworkSummary {
  ontCount: number;
  byStatus: Record<OntStatus, number>;
  totalFiberKm: number;
  totalSplices: number;
  totalConnectors: number;
  splitterCountByRatio: Partial<Record<SplitRatio, number>>;
  splitterTotal: number;
  oltCount: number;
  oltActive: number;
  /** Mean received power across all ONTs that have signal. */
  meanRxDbm: number | null;
  worstRxDbm: number | null;
  /** True when every ONT on the canvas sits inside the optimal window. */
  allOptimal: boolean;
  hasFault: boolean;
}

export interface SimulationResult {
  ontTelemetry: Record<string, OntTelemetry>;
  /** Best path per ONT id. */
  bestPaths: Record<string, OpticalPath>;
  edgeTelemetry: Record<string, EdgeTelemetry>;
  summary: NetworkSummary;
  /** Monotonic counter so consumers can animate on re-run. */
  runId: number;
  safetyMarginDb: number;
  computedAt: number;
}

/* -------------------------------------------------------------------------- *
 * Global design settings
 * -------------------------------------------------------------------------- */

export interface DesignSettings {
  safetyMarginDb: number;
  /** When true the simulator recalculates on every edit. */
  autoRun: boolean;
}

export const DEFAULT_SETTINGS: DesignSettings = {
  safetyMarginDb: DEFAULT_SAFETY_MARGIN_DB,
  autoRun: true,
};

/* -------------------------------------------------------------------------- *
 * Exportable topology document
 * -------------------------------------------------------------------------- */

export interface TopologyExport {
  format: 'ftth-studio/topology';
  version: 1;
  exportedAt: string;
  settings: DesignSettings;
  nodes: PonNode[];
  edges: PonEdge[];
  simulation: {
    summary: NetworkSummary;
    ontTelemetry: Record<string, OntTelemetry>;
  };
}

/* -------------------------------------------------------------------------- *
 * Node factory signatures (used by the toolbox + presets)
 * -------------------------------------------------------------------------- */

export interface NodeFactory {
  data: AnyNodeData;
  /** Canvas size hint so presets can lay out cleanly. */
  width: number;
  height: number;
}
