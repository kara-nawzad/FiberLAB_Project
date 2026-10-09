import { useMemo } from 'react';
import {
  Cable,
  CircleSlash,
  Link2,
  Radio,
  Router,
  Split,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CableType,
  OltClass,
  OntTelemetry,
  PonEdge,
  PonNode,
  SimulationResult,
  SplitRatio,
  Wavelength,
} from '../types';
import {
  ATTENUATION_DB_PER_KM,
  CABLE_SPECS,
  CONNECTOR_LOSS_DB,
  OLT_CLASS_SPECS,
  ONT_THRESHOLDS,
  SPLIT_RATIOS,
  SPLITTER_LOSS_DB,
  SPLICE_LOSS_DB,
  STATUS_STYLES,
  WAVELENGTH_LABEL,
} from '../types';
import {
  computeFiberLoss,
  computeSplitterLoss,
  describeStatus,
  formatDbm,
  isFiberNode,
  isOltNode,
  isOntNode,
  isSplitterNode,
} from '../engine/opticalSimulator';

/* ========================================================================== *
 * Properties Inspector — live editing of every physical parameter.
 * ========================================================================== */

interface InspectorProps {
  node: PonNode | null;
  edge: PonEdge | null;
  simulation: SimulationResult;
  onPatchNode: (nodeId: string, patch: Partial<PonNode['data']>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-[11px] font-medium text-noc-300">{label}</label>
        <span className="font-mono text-[11px] font-semibold text-sky-300">
          {value.toFixed(step < 1 ? 2 : 0)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function SegmentTable({ telemetry }: { telemetry: OntTelemetry }) {
  return (
    <div className="overflow-hidden rounded-md border border-noc-700/60">
      <table className="w-full font-mono text-[10px]">
        <thead>
          <tr className="bg-noc-800/80 text-noc-400">
            <th className="px-2 py-1 text-left font-medium">Element</th>
            <th className="px-2 py-1 text-right font-medium">Loss</th>
          </tr>
        </thead>
        <tbody>
          {telemetry.segments.length === 0 ? (
            <tr>
              <td className="px-2 py-1.5 text-noc-500" colSpan={2}>
                No active path
              </td>
            </tr>
          ) : (
            telemetry.segments.map((segment, index) => (
              <tr key={`${segment.component}-${index}`} className="border-t border-noc-700/50">
                <td className="px-2 py-1 text-noc-300">{segment.label}</td>
                <td className="px-2 py-1 text-right text-amber-300">
                  −{segment.lossDb.toFixed(2)}
                </td>
              </tr>
            ))
          )}
          <tr className="border-t border-noc-600 bg-noc-800/60 font-semibold text-noc-200">
            <td className="px-2 py-1">Total path loss</td>
            <td className="px-2 py-1 text-right">−{telemetry.totalLossDb.toFixed(2)} dB</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Inspector({
  node,
  edge,
  simulation,
  onPatchNode,
  onDeleteNode,
  onDeleteEdge,
  onClose,
}: InspectorProps) {
  const telemetry = node && isOntNode(node) ? simulation.ontTelemetry[node.id] : undefined;

  const header = useMemo(() => {
    if (node) {
      if (isOltNode(node)) return { icon: <Radio size={14} />, title: 'OLT Transceiver', accent: '#38bdf8' };
      if (isSplitterNode(node)) return { icon: <Split size={14} />, title: 'Optical Splitter', accent: '#a78bfa' };
      if (isFiberNode(node)) return { icon: <Cable size={14} />, title: 'Fiber Cable Span', accent: '#22d383' };
      if (isOntNode(node)) return { icon: <Router size={14} />, title: 'ONT / ONU', accent: '#22d383' };
    }
    return { icon: <Link2 size={14} />, title: 'Optical Patch Cord', accent: '#5d6c8f' };
  }, [node]);

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-l border-noc-700/70 bg-noc-900/70">
      <div className="panel-header">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{ background: `${header.accent}22`, color: header.accent }}
          >
            {header.icon}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-noc-200">{header.title}</div>
            <div className="truncate font-mono text-[10px] text-noc-500">
              {node?.id ?? edge?.id ?? '—'}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost !p-1.5"
          onClick={onClose}
          aria-label="Close inspector"
          title="Close inspector"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!node && !edge ? (
          <div className="mt-10 px-4 text-center">
            <CircleSlash size={28} className="mx-auto mb-3 text-noc-600" />
            <p className="text-[12px] font-medium text-noc-300">Nothing selected</p>
            <p className="mt-1 text-[11px] leading-relaxed text-noc-500">
              Click any element or patch cord on the canvas to inspect and edit its physical
              parameters.
            </p>
          </div>
        ) : null}

        {/* ------------------------------------------------------------ OLT */}
        {node && isOltNode(node) ? (
          <>
            <Row label="PON port name">
              <input
                className="input"
                value={node.data.portName}
                onChange={(event) => onPatchNode(node.id, { portName: event.target.value })}
              />
            </Row>
            <Row label="Transceiver class">
              <select
                className="select"
                value={node.data.oltClass}
                onChange={(event) => {
                  const oltClass = event.target.value as OltClass;
                  onPatchNode(node.id, {
                    oltClass,
                    txPowerDbm: OLT_CLASS_SPECS[oltClass].txPowerDbm,
                  });
                }}
              >
                {(Object.keys(OLT_CLASS_SPECS) as OltClass[]).map((key) => (
                  <option key={key} value={key}>
                    {OLT_CLASS_SPECS[key].label}
                  </option>
                ))}
              </select>
            </Row>
            <SliderRow
              label="Tx launch power"
              value={node.data.txPowerDbm}
              min={-5}
              max={10}
              step={0.1}
              unit="dBm"
              onChange={(value) => onPatchNode(node.id, { txPowerDbm: value })}
            />
            <Row label="Operating wavelength">
              <select
                className="select"
                value={node.data.wavelength}
                onChange={(event) =>
                  onPatchNode(node.id, { wavelength: Number(event.target.value) as Wavelength })
                }
              >
                <option value={1310}>{WAVELENGTH_LABEL[1310]}</option>
                <option value={1490}>{WAVELENGTH_LABEL[1490]}</option>
              </select>
            </Row>
            <div className="mb-3 flex items-center justify-between rounded-md border border-noc-700/60 bg-noc-950/50 px-2 py-2">
              <div>
                <div className="text-[11px] font-medium text-noc-300">Laser transmitter</div>
                <div className="font-mono text-[10px] text-noc-500">
                  {node.data.laserOn ? 'Emitting — downstream live' : 'Disabled — all ONTs go dark'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={node.data.laserOn}
                onClick={() => onPatchNode(node.id, { laserOn: !node.data.laserOn })}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  node.data.laserOn ? 'bg-emerald-500/80' : 'bg-noc-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    node.data.laserOn ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="metric">
                <div className="text-[9px] uppercase tracking-wide text-noc-400">Class budget</div>
                <div className="metric-value">
                  {OLT_CLASS_SPECS[node.data.oltClass].linkBudgetDb.toFixed(0)} dB
                </div>
              </div>
              <div className="metric">
                <div className="text-[9px] uppercase tracking-wide text-noc-400">Rx sensitivity</div>
                <div className="metric-value">
                  {OLT_CLASS_SPECS[node.data.oltClass].rxSensitivityDbm.toFixed(0)} dBm
                </div>
              </div>
            </div>
          </>
        ) : null}

        {/* -------------------------------------------------------- Splitter */}
        {node && isSplitterNode(node) ? (
          <>
            <Row label="Split ratio">
              <select
                className="select"
                value={node.data.ratio}
                onChange={(event) =>
                  onPatchNode(node.id, { ratio: Number(event.target.value) as SplitRatio })
                }
              >
                {SPLIT_RATIOS.map((ratio) => (
                  <option key={ratio} value={ratio}>
                    1:{ratio}
                  </option>
                ))}
              </select>
            </Row>
            <div className="mb-3 overflow-hidden rounded-md border border-noc-700/60">
              <table className="w-full font-mono text-[10px]">
                <thead>
                  <tr className="bg-noc-800/80 text-noc-400">
                    <th className="px-2 py-1 text-left font-medium">Ratio</th>
                    <th className="px-2 py-1 text-right font-medium">Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {SPLIT_RATIOS.map((ratio) => (
                    <tr
                      key={ratio}
                      className={`border-t border-noc-700/50 ${
                        ratio === node.data.ratio ? 'bg-purple-500/10 text-purple-200' : 'text-noc-300'
                      }`}
                    >
                      <td className="px-2 py-0.5">1:{ratio}</td>
                      <td className="px-2 py-0.5 text-right">{SPLITTER_LOSS_DB[ratio].toFixed(1)} dB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SliderRow
              label="Excess / uniformity loss"
              value={node.data.excessLossDb}
              min={0}
              max={3}
              step={0.05}
              unit="dB"
              onChange={(value) => onPatchNode(node.id, { excessLossDb: value })}
            />
            <div className="metric">
              <div className="text-[9px] uppercase tracking-wide text-noc-400">Total insertion loss</div>
              <div className="metric-value text-purple-300">
                {computeSplitterLoss(node.data).toFixed(2)} dB
              </div>
            </div>
          </>
        ) : null}

        {/* ----------------------------------------------------------- Fiber */}
        {node && isFiberNode(node) ? (
          <>
            <Row label="Cable preset">
              <select
                className="select"
                value={node.data.cableType}
                onChange={(event) => {
                  const cableType = event.target.value as CableType;
                  const spec = CABLE_SPECS[cableType];
                  onPatchNode(node.id, {
                    cableType,
                    lengthKm: spec.defaultLengthKm,
                    splices: spec.defaultSplices,
                    connectors: spec.defaultConnectors,
                  });
                }}
              >
                {(Object.keys(CABLE_SPECS) as CableType[]).map((cable) => (
                  <option key={cable} value={cable}>
                    {CABLE_SPECS[cable].label}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Span length (km)">
              <input
                className="input"
                type="number"
                min={0}
                step={0.05}
                value={node.data.lengthKm}
                onChange={(event) =>
                  onPatchNode(node.id, { lengthKm: Math.max(0, Number(event.target.value) || 0) })
                }
              />
            </Row>
            <SliderRow
              label="Span length"
              value={node.data.lengthKm}
              min={0}
              max={40}
              step={0.05}
              unit="km"
              onChange={(value) => onPatchNode(node.id, { lengthKm: value })}
            />
            <Row label="Operating wavelength">
              <select
                className="select"
                value={node.data.wavelength}
                onChange={(event) => {
                  onPatchNode(node.id, {
                    wavelength: Number(event.target.value) as Wavelength,
                    attenuationOverrideDbPerKm: null,
                  });
                }}
              >
                <option value={1310}>
                  {WAVELENGTH_LABEL[1310]} — {ATTENUATION_DB_PER_KM[1310].toFixed(2)} dB/km
                </option>
                <option value={1490}>
                  {WAVELENGTH_LABEL[1490]} — {ATTENUATION_DB_PER_KM[1490].toFixed(2)} dB/km
                </option>
              </select>
            </Row>
            <Row label="Attenuation coefficient (dB/km)">
              <div className="flex gap-1.5">
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder={computeFiberLoss(node.data).attenuationDbPerKm.toFixed(2)}
                  value={node.data.attenuationOverrideDbPerKm ?? ''}
                  onChange={(event) => {
                    const raw = event.target.value;
                    onPatchNode(node.id, {
                      attenuationOverrideDbPerKm: raw === '' ? null : Math.max(0, Number(raw)),
                    });
                  }}
                />
                <button
                  type="button"
                  className="btn-ghost shrink-0"
                  onClick={() => onPatchNode(node.id, { attenuationOverrideDbPerKm: null })}
                  title="Reset to the wavelength default"
                >
                  Auto
                </button>
              </div>
            </Row>
            <SliderRow
              label="Fusion splices"
              value={node.data.splices}
              min={0}
              max={20}
              step={1}
              unit={`× ${SPLICE_LOSS_DB} dB`}
              onChange={(value) => onPatchNode(node.id, { splices: value })}
            />
            <SliderRow
              label="SC/APC connectors"
              value={node.data.connectors}
              min={0}
              max={12}
              step={1}
              unit={`× ${CONNECTOR_LOSS_DB} dB`}
              onChange={(value) => onPatchNode(node.id, { connectors: value })}
            />
            <div className="grid grid-cols-2 gap-1.5">
              <div className="metric">
                <div className="text-[9px] uppercase tracking-wide text-noc-400">Cable loss</div>
                <div className="metric-value">{computeFiberLoss(node.data).cableDb.toFixed(2)} dB</div>
              </div>
              <div className="metric">
                <div className="text-[9px] uppercase tracking-wide text-noc-400">Span total</div>
                <div className="metric-value text-emerald-300">
                  {computeFiberLoss(node.data).totalDb.toFixed(2)} dB
                </div>
              </div>
            </div>
          </>
        ) : null}

        {/* ------------------------------------------------------------- ONT */}
        {node && isOntNode(node) ? (
          <>
            <Row label="Subscriber">
              <input
                className="input"
                value={node.data.subscriber}
                onChange={(event) => onPatchNode(node.id, { subscriber: event.target.value })}
              />
            </Row>
            <Row label="ONT serial number">
              <input
                className="input"
                value={node.data.serial}
                onChange={(event) => onPatchNode(node.id, { serial: event.target.value })}
              />
            </Row>
            {telemetry ? (
              <>
                <div
                  className="mb-3 flex items-center gap-2 rounded-md border px-2.5 py-2"
                  style={{
                    borderColor: `${STATUS_STYLES[telemetry.status].hex}66`,
                    background: `${STATUS_STYLES[telemetry.status].hex}14`,
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      background: STATUS_STYLES[telemetry.status].hex,
                      boxShadow: `0 0 8px ${STATUS_STYLES[telemetry.status].hex}`,
                    }}
                  />
                  <div className="min-w-0">
                    <div
                      className="font-mono text-[12px] font-bold"
                      style={{ color: STATUS_STYLES[telemetry.status].hex }}
                    >
                      {STATUS_STYLES[telemetry.status].label}
                    </div>
                    <div className="truncate text-[10px] text-noc-400">
                      {describeStatus(telemetry.status)}
                    </div>
                  </div>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-1.5">
                  <div className="metric">
                    <div className="text-[9px] uppercase tracking-wide text-noc-400">Rx power</div>
                    <div
                      className="metric-value"
                      style={{ color: STATUS_STYLES[telemetry.status].hex }}
                    >
                      {formatDbm(telemetry.rxPowerDbm)}
                    </div>
                  </div>
                  <div className="metric">
                    <div className="text-[9px] uppercase tracking-wide text-noc-400">Link margin</div>
                    <div className="metric-value">
                      {telemetry.rxPowerDbm === null ? '—' : `${telemetry.marginDb.toFixed(2)} dB`}
                    </div>
                  </div>
                  <div className="metric">
                    <div className="text-[9px] uppercase tracking-wide text-noc-400">Feeder route</div>
                    <div className="metric-value">
                      {telemetry.rxPowerDbm === null ? '—' : `${telemetry.fiberKm.toFixed(2)} km`}
                    </div>
                  </div>
                  <div className="metric">
                    <div className="text-[9px] uppercase tracking-wide text-noc-400">Split ratio</div>
                    <div className="metric-value">
                      {telemetry.rxPowerDbm === null ? '—' : `1:${telemetry.cumulativeSplitRatio}`}
                    </div>
                  </div>
                </div>
                <div className="eyebrow mb-1.5">Link budget breakdown</div>
                <SegmentTable telemetry={telemetry} />
                <div className="mt-2 rounded-md border border-noc-700/60 bg-noc-950/50 p-2 font-mono text-[10px] leading-relaxed text-noc-400">
                  <div className="mb-1 text-noc-300">
                    P_rx = P_tx − ΣL − margin
                  </div>
                  <div>
                    P_rx = {formatDbm(telemetry.rxPowerDbm !== null
                      ? telemetry.rxPowerDbm + telemetry.totalLossDb
                      : null)}{' '}
                    − {telemetry.totalLossDb.toFixed(2)} dB
                  </div>
                  <div className="mt-1 text-noc-500">
                    Window: overload &gt; {ONT_THRESHOLDS.overloadDbm} · optimal ≥{' '}
                    {ONT_THRESHOLDS.optimalFloorDbm} · warn ≥ {ONT_THRESHOLDS.warningFloorDbm} dBm
                  </div>
                </div>
                {telemetry.candidatePaths.length > 1 ? (
                  <div className="mt-2 rounded-md border border-noc-700/60 bg-noc-950/50 p-2 font-mono text-[10px] text-noc-400">
                    {telemetry.candidatePaths.length} OLT paths reach this ONT — showing the best (
                    {formatDbm(telemetry.rxPowerDbm)}).
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {/* ------------------------------------------------------------ Edge */}
        {!node && edge ? (
          <>
            <div className="mb-3 rounded-md border border-noc-700/60 bg-noc-950/50 p-2 font-mono text-[10px] text-noc-400">
              <div className="mb-1 text-noc-300">Patch cord</div>
              <div className="break-all">{edge.source} → {edge.target}</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="metric">
                <div className="text-[9px] uppercase tracking-wide text-noc-400">Power at far end</div>
                <div className="metric-value">
                  {formatDbm(simulation.edgeTelemetry[edge.id]?.powerDbm ?? null)}
                </div>
              </div>
              <div className="metric">
                <div className="text-[9px] uppercase tracking-wide text-noc-400">State</div>
                <div className="metric-value uppercase">
                  {simulation.edgeTelemetry[edge.id]?.edgeState ?? 'idle'}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-noc-500">
              A patch cord adds no loss of its own — its attenuation belongs to the fiber span it
              terminates on. Delete it to break the optical path.
            </p>
            <button type="button" className="btn-danger mt-3 w-full" onClick={() => onDeleteEdge(edge.id)}>
              <Trash2 size={13} /> Delete patch cord
            </button>
          </>
        ) : null}
      </div>

      {node ? (
        <div className="border-t border-noc-700/70 p-3">
          <button type="button" className="btn-danger w-full" onClick={() => onDeleteNode(node.id)}>
            <Trash2 size={13} /> Remove element
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export default Inspector;
