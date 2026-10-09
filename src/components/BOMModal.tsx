import { useMemo } from 'react';
import { Download, FileJson, Table2, X } from 'lucide-react';
import type {
  DesignSettings,
  PonEdge,
  PonNode,
  SimulationResult,
  SplitRatio,
  TopologyExport,
} from '../types';
import { SPLIT_RATIOS, SPLITTER_LOSS_DB, STATUS_STYLES } from '../types';
import { describeStatus, formatDbm } from '../engine/opticalSimulator';

/* ========================================================================== *
 * Bill of Materials — deployment statistics + per-subscriber optical budget.
 * ========================================================================== */

interface BOMModalProps {
  open: boolean;
  onClose: () => void;
  nodes: PonNode[];
  edges: PonEdge[];
  simulation: SimulationResult;
  settings: DesignSettings;
}

function triggerDownload(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildExport(
  nodes: PonNode[],
  edges: PonEdge[],
  simulation: SimulationResult,
  settings: DesignSettings,
): TopologyExport {
  return {
    format: 'ftth-studio/topology',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    nodes,
    edges,
    simulation: {
      summary: simulation.summary,
      ontTelemetry: simulation.ontTelemetry,
    },
  };
}

function buildCsv(nodes: PonNode[], simulation: SimulationResult): string {
  const headers = [
    'ont_id',
    'subscriber',
    'serial',
    'status',
    'rx_power_dbm',
    'total_path_loss_db',
    'link_margin_db',
    'fiber_km',
    'split_stages',
    'cumulative_split_ratio',
    'splices',
    'connectors',
    'source_olt',
  ];

  const rows = nodes
    .filter((node) => node.type === 'ont')
    .map((node) => {
      const telemetry = simulation.ontTelemetry[node.id];
      const data = node.data as { serial: string; subscriber: string };
      if (!telemetry) return null;
      return [
        node.id,
        `"${data.subscriber.replace(/"/g, '""')}"`,
        data.serial,
        telemetry.status,
        telemetry.rxPowerDbm ?? '',
        telemetry.totalLossDb,
        telemetry.rxPowerDbm === null ? '' : telemetry.marginDb,
        telemetry.fiberKm,
        telemetry.splitStages,
        telemetry.cumulativeSplitRatio,
        telemetry.splices,
        telemetry.connectors,
        telemetry.sourceOltId ?? '',
      ].join(',');
    })
    .filter((row): row is string => row !== null);

  return [headers.join(','), ...rows].join('\n');
}

function StatCard({
  label,
  value,
  sub,
  tone = 'text-noc-200',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-noc-700/60 bg-noc-950/50 px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-noc-400">{label}</div>
      <div className={`mt-0.5 font-mono text-xl font-bold leading-tight ${tone}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-[10px] text-noc-500">{sub}</div> : null}
    </div>
  );
}

export function BOMModal({ open, onClose, nodes, edges, simulation, settings }: BOMModalProps) {
  const summary = simulation.summary;

  const ontRows = useMemo(
    () =>
      nodes
        .filter((node) => node.type === 'ont')
        .map((node) => ({ node, telemetry: simulation.ontTelemetry[node.id] }))
        .filter((row) => row.telemetry !== undefined)
        .sort((a, b) => (b.telemetry?.rxPowerDbm ?? -999) - (a.telemetry?.rxPowerDbm ?? -999)),
    [nodes, simulation],
  );

  if (!open) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="panel flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl shadow-panel">
        <div className="panel-header !py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/15 text-sky-300">
              <Table2 size={15} />
            </span>
            <div>
              <div className="text-[14px] font-semibold text-noc-200">Bill of Materials</div>
              <div className="text-[10px] text-noc-500">
                Deployment summary &amp; per-subscriber optical budget
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                triggerDownload(
                  `ftth-bom-${timestamp}.csv`,
                  buildCsv(nodes, simulation),
                  'text/csv;charset=utf-8',
                )
              }
            >
              <Download size={13} /> CSV
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                triggerDownload(
                  `ftth-topology-${timestamp}.json`,
                  JSON.stringify(buildExport(nodes, edges, simulation, settings), null, 2),
                  'application/json',
                )
              }
            >
              <FileJson size={13} /> Export JSON
            </button>
            <button
              type="button"
              className="btn-ghost !p-1.5"
              onClick={onClose}
              aria-label="Close bill of materials"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* ------------------------- Headline metrics ------------------------- */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard
              label="Fiber deployed"
              value={`${summary.totalFiberKm.toFixed(2)}`}
              sub="km of plant on canvas"
              tone="text-sky-300"
            />
            <StatCard
              label="ONTs provisioned"
              value={`${summary.ontCount}`}
              sub={`${summary.oltActive}/${summary.oltCount} OLT lasers active`}
            />
            <StatCard
              label="Online"
              value={`${summary.byStatus.ONLINE + summary.byStatus.WARNING + summary.byStatus.OVERLOAD}`}
              sub={`${summary.byStatus.ONLINE} optimal · ${summary.byStatus.WARNING} marginal`}
              tone="text-emerald-300"
            />
            <StatCard
              label="Offline"
              value={`${summary.byStatus.LOS + summary.byStatus.DISCONNECTED}`}
              sub={`${summary.byStatus.LOS} LOS · ${summary.byStatus.DISCONNECTED} unwired`}
              tone={
                summary.byStatus.LOS + summary.byStatus.DISCONNECTED > 0
                  ? 'text-red-300'
                  : 'text-noc-200'
              }
            />
          </div>

          {/* --------------------------- Passive plant -------------------------- */}
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-noc-700/60 bg-noc-950/50 p-3">
              <div className="eyebrow mb-2">Splitters by ratio</div>
              {summary.splitterTotal === 0 ? (
                <p className="text-[11px] text-noc-500">No splitters deployed.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {SPLIT_RATIOS.filter((ratio: SplitRatio) => summary.splitterCountByRatio[ratio]).map(
                    (ratio) => (
                      <span
                        key={ratio}
                        className="rounded border border-purple-500/40 bg-purple-500/15 px-2 py-1 font-mono text-[11px] text-purple-200"
                      >
                        1:{ratio} × {summary.splitterCountByRatio[ratio]}
                        <span className="ml-1.5 text-purple-300/60">
                          −{SPLITTER_LOSS_DB[ratio].toFixed(1)} dB each
                        </span>
                      </span>
                    ),
                  )}
                </div>
              )}
              <div className="mt-2 border-t border-noc-700/50 pt-2 font-mono text-[11px] text-noc-400">
                Total passive splitters: <span className="text-noc-200">{summary.splitterTotal}</span>
              </div>
            </div>

            <div className="rounded-lg border border-noc-700/60 bg-noc-950/50 p-3">
              <div className="eyebrow mb-2">Termination &amp; splicing</div>
              <table className="w-full font-mono text-[11px]">
                <tbody className="text-noc-300">
                  <tr>
                    <td className="py-0.5 text-noc-400">Fusion splices</td>
                    <td className="py-0.5 text-right">{summary.totalSplices}</td>
                    <td className="py-0.5 pl-3 text-right text-noc-500">
                      {(summary.totalSplices * 0.1).toFixed(1)} dB worst case
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 text-noc-400">SC/APC connectors</td>
                    <td className="py-0.5 text-right">{summary.totalConnectors}</td>
                    <td className="py-0.5 pl-3 text-right text-noc-500">
                      {(summary.totalConnectors * 0.5).toFixed(1)} dB worst case
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 text-noc-400">Safety margin</td>
                    <td className="py-0.5 text-right">{settings.safetyMarginDb.toFixed(1)} dB</td>
                    <td className="py-0.5 pl-3 text-right text-noc-500">per subscriber</td>
                  </tr>
                  <tr className="border-t border-noc-700/50">
                    <td className="py-1 text-noc-400">Mean Rx power</td>
                    <td className="py-1 text-right text-noc-200" colSpan={2}>
                      {formatDbm(summary.meanRxDbm)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 text-noc-400">Worst Rx power</td>
                    <td className="py-0.5 text-right text-noc-200" colSpan={2}>
                      {formatDbm(summary.worstRxDbm)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ----------------------- Per-subscriber budget ---------------------- */}
          <div className="mt-4">
            <div className="eyebrow mb-2">Optical budget per subscriber</div>
            <div className="overflow-hidden rounded-lg border border-noc-700/60">
              <table className="w-full font-mono text-[11px]">
                <thead>
                  <tr className="bg-noc-800/80 text-[10px] uppercase tracking-wide text-noc-400">
                    <th className="px-2 py-2 text-left font-medium">Subscriber</th>
                    <th className="px-2 py-2 text-left font-medium">Status</th>
                    <th className="px-2 py-2 text-right font-medium">Rx dBm</th>
                    <th className="px-2 py-2 text-right font-medium">Loss dB</th>
                    <th className="px-2 py-2 text-right font-medium">Margin</th>
                    <th className="px-2 py-2 text-right font-medium">Fiber km</th>
                    <th className="px-2 py-2 text-right font-medium">Split</th>
                    <th className="px-2 py-2 text-right font-medium">SPL</th>
                    <th className="px-2 py-2 text-right font-medium">CON</th>
                    <th className="px-2 py-2 text-left font-medium">OLT port</th>
                  </tr>
                </thead>
                <tbody>
                  {ontRows.length === 0 ? (
                    <tr>
                      <td className="px-2 py-3 text-noc-500" colSpan={10}>
                        No ONTs on the canvas yet — drag one in from the toolbox.
                      </td>
                    </tr>
                  ) : (
                    ontRows.map(({ node, telemetry }) => {
                      if (!telemetry) return null;
                      const style = STATUS_STYLES[telemetry.status];
                      const data = node.data as { serial: string; subscriber: string };
                      const path = simulation.bestPaths[node.id];
                      return (
                        <tr
                          key={node.id}
                          className="border-t border-noc-700/50 text-noc-300 hover:bg-noc-800/40"
                        >
                          <td className="px-2 py-1.5">
                            <div className="truncate font-sans text-[11px] text-noc-200">
                              {data.subscriber}
                            </div>
                            <div className="text-[9px] text-noc-500">{data.serial}</div>
                          </td>
                          <td className="px-2 py-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded border px-1.5 py-[1px] text-[9px] font-semibold ${style.badge}`}
                              title={describeStatus(telemetry.status)}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: style.hex }}
                              />
                              {style.label}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold" style={{ color: style.hex }}>
                            {formatDbm(telemetry.rxPowerDbm)}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {telemetry.rxPowerDbm === null ? '—' : telemetry.totalLossDb.toFixed(2)}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {telemetry.rxPowerDbm === null ? '—' : `${telemetry.marginDb.toFixed(2)}`}
                          </td>
                          <td className="px-2 py-1.5 text-right">{telemetry.fiberKm.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right">
                            {telemetry.rxPowerDbm === null ? '—' : `1:${telemetry.cumulativeSplitRatio}`}
                          </td>
                          <td className="px-2 py-1.5 text-right">{telemetry.splices}</td>
                          <td className="px-2 py-1.5 text-right">{telemetry.connectors}</td>
                          <td className="px-2 py-1.5 text-[10px] text-noc-400">
                            {path ? `${path.oltPort} @ ${path.txPowerDbm.toFixed(1)} dBm` : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* -------------------------- Status legend -------------------------- */}
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(STATUS_STYLES) as Array<keyof typeof STATUS_STYLES>).map((key) => (
              <div
                key={key}
                className="flex items-center gap-1.5 rounded border border-noc-700/60 bg-noc-950/50 px-2 py-1"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: STATUS_STYLES[key].hex,
                    boxShadow: `0 0 6px ${STATUS_STYLES[key].hex}`,
                  }}
                />
                <span className="font-mono text-[10px] text-noc-300">{STATUS_STYLES[key].label}</span>
                <span className="font-mono text-[10px] text-noc-500">{summary.byStatus[key]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BOMModal;
