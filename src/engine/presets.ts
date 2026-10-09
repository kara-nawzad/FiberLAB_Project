import type { PonEdge, PonNode } from '../types';

/* ========================================================================== *
 * Preset topologies
 *
 * Preset A — "Standard 1:32 GPON Tree"
 *   OLT -> 5 km feeder -> 1:4 -> 1 km distribution -> 1:8 -> 300 m drop -> ONT
 *   Aggregate split 1:4 x 1:8 = 1:32. Three subscribers hang off the 1:8 so the
 *   tree demonstrates healthy, marginal and long-drop behaviour at once.
 *
 * Preset B — "Failing Long-Distance Link"
 *   A 1:512 cascade stretched over ~30 km of plant: both wired ONTs fall into
 *   LOS, and a third ONT is left unwired to show the DISCONNECTED state.
 * ========================================================================== */

export interface Preset {
  id: string;
  name: string;
  description: string;
  build: () => { nodes: PonNode[]; edges: PonEdge[] };
}

const edge = (id: string, source: string, target: string, sourceHandle: string): PonEdge => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle: 'in',
  type: 'optical',
});

/* --------------------------------- Preset A -------------------------------- */

function buildStandardTree(): { nodes: PonNode[]; edges: PonEdge[] } {
  const nodes: PonNode[] = [
    {
      id: 'olt-a',
      type: 'olt',
      position: { x: 40, y: 208 },
      data: {
        kind: 'olt',
        portName: 'PON 0/1/0',
        oltClass: 'B+',
        txPowerDbm: 3.0,
        laserOn: true,
        wavelength: 1490,
      },
    },
    {
      id: 'fiber-feeder-a',
      type: 'fiber',
      position: { x: 320, y: 208 },
      data: {
        kind: 'fiber',
        cableType: 'feeder',
        lengthKm: 5,
        splices: 0,
        connectors: 2,
        wavelength: 1490,
        attenuationOverrideDbPerKm: null,
      },
    },
    {
      id: 'splitter-1x4-a',
      type: 'splitter',
      position: { x: 610, y: 216 },
      data: { kind: 'splitter', ratio: 4, excessLossDb: 0 },
    },
    {
      id: 'fiber-dist-a',
      type: 'fiber',
      position: { x: 880, y: 208 },
      data: {
        kind: 'fiber',
        cableType: 'distribution',
        lengthKm: 1,
        splices: 2,
        connectors: 2,
        wavelength: 1490,
        attenuationOverrideDbPerKm: null,
      },
    },
    {
      id: 'splitter-1x8-a',
      type: 'splitter',
      position: { x: 1170, y: 216 },
      data: { kind: 'splitter', ratio: 8, excessLossDb: 0 },
    },
    {
      id: 'fiber-drop-a1',
      type: 'fiber',
      position: { x: 1450, y: 56 },
      data: {
        kind: 'fiber',
        cableType: 'drop',
        lengthKm: 0.3,
        splices: 1,
        connectors: 2,
        wavelength: 1490,
        attenuationOverrideDbPerKm: null,
      },
    },
    {
      id: 'ont-a1',
      type: 'ont',
      position: { x: 1750, y: 48 },
      data: {
        kind: 'ont',
        serial: 'HWTC00100001',
        subscriber: 'Al-Sulaymaniyah — Unit 12',
        sensitivityDbm: -28,
      },
    },
    {
      id: 'fiber-drop-a2',
      type: 'fiber',
      position: { x: 1450, y: 240 },
      data: {
        kind: 'fiber',
        cableType: 'drop',
        lengthKm: 1.2,
        splices: 3,
        connectors: 2,
        wavelength: 1490,
        attenuationOverrideDbPerKm: null,
      },
    },
    {
      id: 'ont-a2',
      type: 'ont',
      position: { x: 1750, y: 232 },
      data: {
        kind: 'ont',
        serial: 'HWTC00100002',
        subscriber: 'Al-Sulaymaniyah — Unit 14',
        sensitivityDbm: -28,
      },
    },
    {
      id: 'fiber-drop-a3',
      type: 'fiber',
      position: { x: 1450, y: 424 },
      data: {
        kind: 'fiber',
        cableType: 'drop',
        lengthKm: 6,
        splices: 4,
        connectors: 4,
        wavelength: 1490,
        attenuationOverrideDbPerKm: null,
      },
    },
    {
      id: 'ont-a3',
      type: 'ont',
      position: { x: 1750, y: 416 },
      data: {
        kind: 'ont',
        serial: 'HWTC00100003',
        subscriber: 'Tanaro Village — Remote',
        sensitivityDbm: -28,
      },
    },
  ];

  const edges: PonEdge[] = [
    edge('e-a1', 'olt-a', 'fiber-feeder-a', 'out'),
    edge('e-a2', 'fiber-feeder-a', 'splitter-1x4-a', 'out'),
    edge('e-a3', 'splitter-1x4-a', 'fiber-dist-a', 'out-0'),
    edge('e-a4', 'fiber-dist-a', 'splitter-1x8-a', 'out'),
    edge('e-a5', 'splitter-1x8-a', 'fiber-drop-a1', 'out-0'),
    edge('e-a6', 'fiber-drop-a1', 'ont-a1', 'out'),
    edge('e-a7', 'splitter-1x8-a', 'fiber-drop-a2', 'out-1'),
    edge('e-a8', 'fiber-drop-a2', 'ont-a2', 'out'),
    edge('e-a9', 'splitter-1x8-a', 'fiber-drop-a3', 'out-2'),
    edge('e-a10', 'fiber-drop-a3', 'ont-a3', 'out'),
  ];

  return { nodes, edges };
}

/* --------------------------------- Preset B -------------------------------- */

function buildFailingLink(): { nodes: PonNode[]; edges: PonEdge[] } {
  const nodes: PonNode[] = [
    {
      id: 'olt-b',
      type: 'olt',
      position: { x: 40, y: 200 },
      data: {
        kind: 'olt',
        portName: 'PON 0/2/3',
        oltClass: 'C+',
        txPowerDbm: 5.0,
        laserOn: true,
        wavelength: 1490,
      },
    },
    {
      id: 'fiber-feeder-b',
      type: 'fiber',
      position: { x: 320, y: 200 },
      data: {
        kind: 'fiber',
        cableType: 'feeder',
        lengthKm: 20,
        splices: 2,
        connectors: 2,
        wavelength: 1490,
        attenuationOverrideDbPerKm: null,
      },
    },
    {
      id: 'splitter-1x32-b',
      type: 'splitter',
      position: { x: 610, y: 208 },
      data: { kind: 'splitter', ratio: 32, excessLossDb: 0 },
    },
    {
      id: 'fiber-dist-b',
      type: 'fiber',
      position: { x: 880, y: 200 },
      data: {
        kind: 'fiber',
        cableType: 'distribution',
        lengthKm: 8,
        splices: 4,
        connectors: 2,
        wavelength: 1490,
        attenuationOverrideDbPerKm: null,
      },
    },
    {
      id: 'splitter-1x16-b',
      type: 'splitter',
      position: { x: 1170, y: 208 },
      data: { kind: 'splitter', ratio: 16, excessLossDb: 0 },
    },
    {
      id: 'fiber-drop-b1',
      type: 'fiber',
      position: { x: 1450, y: 48 },
      data: {
        kind: 'fiber',
        cableType: 'drop',
        lengthKm: 1.5,
        splices: 2,
        connectors: 2,
        wavelength: 1490,
        attenuationOverrideDbPerKm: null,
      },
    },
    {
      id: 'ont-b1',
      type: 'ont',
      position: { x: 1750, y: 40 },
      data: {
        kind: 'ont',
        serial: 'ZTEG00200001',
        subscriber: 'Dukan Ridge — Tower 7',
        sensitivityDbm: -28,
      },
    },
    {
      id: 'fiber-drop-b2',
      type: 'fiber',
      position: { x: 1450, y: 232 },
      data: {
        kind: 'fiber',
        cableType: 'drop',
        lengthKm: 0.4,
        splices: 1,
        connectors: 2,
        wavelength: 1490,
        attenuationOverrideDbPerKm: null,
      },
    },
    {
      id: 'ont-b2',
      type: 'ont',
      position: { x: 1750, y: 224 },
      data: {
        kind: 'ont',
        serial: 'ZTEG00200002',
        subscriber: 'Dukan Ridge — Tower 9',
        sensitivityDbm: -28,
      },
    },
    {
      id: 'fiber-drop-b3',
      type: 'fiber',
      position: { x: 1450, y: 416 },
      data: {
        kind: 'fiber',
        cableType: 'drop',
        lengthKm: 0.25,
        splices: 1,
        connectors: 2,
        wavelength: 1490,
        attenuationOverrideDbPerKm: null,
      },
    },
    {
      id: 'ont-b3',
      type: 'ont',
      position: { x: 1750, y: 408 },
      data: {
        kind: 'ont',
        serial: 'ZTEG00200003',
        subscriber: 'Dukan Ridge — Not Yet Wired',
        sensitivityDbm: -28,
      },
    },
  ];

  const edges: PonEdge[] = [
    edge('e-b1', 'olt-b', 'fiber-feeder-b', 'out'),
    edge('e-b2', 'fiber-feeder-b', 'splitter-1x32-b', 'out'),
    edge('e-b3', 'splitter-1x32-b', 'fiber-dist-b', 'out-0'),
    edge('e-b4', 'fiber-dist-b', 'splitter-1x16-b', 'out'),
    edge('e-b5', 'splitter-1x16-b', 'fiber-drop-b1', 'out-0'),
    edge('e-b6', 'fiber-drop-b1', 'ont-b1', 'out'),
    edge('e-b7', 'splitter-1x16-b', 'fiber-drop-b2', 'out-1'),
    edge('e-b8', 'fiber-drop-b2', 'ont-b2', 'out'),
    // fiber-drop-b3 and ont-b3 are deliberately left unpatched (DISCONNECTED).
  ];

  return { nodes, edges };
}

export const PRESETS: Preset[] = [
  {
    id: 'standard-1x32',
    name: 'Standard 1:32 GPON Tree',
    description: 'OLT → 5 km feeder → 1:4 → 1 km distribution → 1:8 → 300 m drop → ONT',
    build: buildStandardTree,
  },
  {
    id: 'failing-long-haul',
    name: 'Failing Long-Distance Link',
    description: 'A 1:512 cascade over ~30 km — subscribers land in LOS / offline',
    build: buildFailingLink,
  },
];

export function buildPreset(id: string): { nodes: PonNode[]; edges: PonEdge[] } | null {
  const preset = PRESETS.find((candidate) => candidate.id === id);
  return preset ? preset.build() : null;
}
