import type {
  CableType,
  FiberNodeData,
  OltClass,
  OltNodeData,
  OntNodeData,
  PonNode,
  SplitRatio,
  SplitterNodeData,
  Wavelength,
} from '../types';
import { CABLE_SPECS, OLT_CLASS_SPECS } from '../types';

/* ========================================================================== *
 * Node factories — single source of truth for defaults, used by the toolbox,
 * the canvas drop handler and the preset topologies.
 * ========================================================================== */

let sequence = 0;

export function nextId(kind: string): string {
  sequence += 1;
  return `${kind}-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function resetIdSequence(): void {
  sequence = 0;
}

export interface NodePlacement {
  id?: string;
  position?: { x: number; y: number };
}

export const NODE_SIZES: Record<string, { width: number; height: number }> = {
  olt: { width: 236, height: 132 },
  splitter: { width: 224, height: 128 },
  fiber: { width: 244, height: 132 },
  ont: { width: 252, height: 138 },
};

let ontSequence = 0;

export function createOltNode(placement: NodePlacement = {}): PonNode {
  const oltClass: OltClass = 'B+';
  const data: OltNodeData = {
    kind: 'olt',
    portName: 'PON 0/1/0',
    oltClass,
    txPowerDbm: OLT_CLASS_SPECS[oltClass].txPowerDbm,
    laserOn: true,
    wavelength: 1490,
  };
  return {
    id: placement.id ?? nextId('olt'),
    type: 'olt',
    position: placement.position ?? { x: 0, y: 0 },
    data,
  };
}

export function createSplitterNode(ratio: SplitRatio = 8, placement: NodePlacement = {}): PonNode {
  const data: SplitterNodeData = {
    kind: 'splitter',
    ratio,
    excessLossDb: 0,
  };
  return {
    id: placement.id ?? nextId('splitter'),
    type: 'splitter',
    position: placement.position ?? { x: 0, y: 0 },
    data,
  };
}

export function createFiberNode(cableType: CableType = 'distribution', placement: NodePlacement = {}): PonNode {
  const spec = CABLE_SPECS[cableType];
  const data: FiberNodeData = {
    kind: 'fiber',
    cableType,
    lengthKm: spec.defaultLengthKm,
    splices: spec.defaultSplices,
    connectors: spec.defaultConnectors,
    wavelength: 1490,
    attenuationOverrideDbPerKm: null,
  };
  return {
    id: placement.id ?? nextId('fiber'),
    type: 'fiber',
    position: placement.position ?? { x: 0, y: 0 },
    data,
  };
}

export function createOntNode(placement: NodePlacement = {}, serial?: string, subscriber?: string): PonNode {
  ontSequence += 1;
  const data: OntNodeData = {
    kind: 'ont',
    serial: serial ?? `HWTC${(100000 + ontSequence).toString().padStart(8, '0')}`,
    subscriber: subscriber ?? `Subscriber ${ontSequence}`,
    sensitivityDbm: -28,
  };
  return {
    id: placement.id ?? nextId('ont'),
    type: 'ont',
    position: placement.position ?? { x: 0, y: 0 },
    data,
  };
}

/** Retunes the optical window of a light source or a cable span. */
export function setWavelengthOnNode(node: PonNode, wavelength: Wavelength): PonNode {
  if (node.type === 'olt') {
    return { ...node, data: { ...node.data, wavelength } };
  }
  if (node.type === 'fiber') {
    return {
      ...node,
      data: { ...node.data, wavelength, attenuationOverrideDbPerKm: null },
    };
  }
  return node;
}
