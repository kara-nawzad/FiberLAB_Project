import { useCallback, useMemo, useState, type DragEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from '@xyflow/react';
import { MousePointer2 } from 'lucide-react';
import type {
  AnyNodeData,
  DesignSettings,
  PonEdge,
  PonNode,
  SimulationResult,
  SplitRatio,
} from './types';
import { DEFAULT_SETTINGS, SPLITTER_OUTPUT_PORTS } from './types';
import {
  createFiberNode,
  createOltNode,
  createOntNode,
  createSplitterNode,
  NODE_SIZES,
  nextId,
} from './engine/factories';
import { buildPreset } from './engine/presets';
import {
  formatDbm,
  isFiberNode,
  isOltNode,
  isOntNode,
  simulateTopology,
} from './engine/opticalSimulator';
import { decorateEdges } from './engine/edgeDecoration';
import { SimulationContext } from './engine/SimulationContext';
import { nodeTypes } from './components/nodes';
import { OpticalEdge } from './components/OpticalEdge';
import { Sidebar, DND_MIME, type ToolboxPayload } from './components/Sidebar';
import { Inspector } from './components/Inspector';
import { BOMModal } from './components/BOMModal';
import { TopBar } from './components/TopBar';

const edgeTypes = { optical: OpticalEdge };

const MINIMAP_COLORS: Record<string, string> = {
  olt: '#38bdf8',
  splitter: '#a78bfa',
  fiber: '#22d383',
  ont: '#f5b544',
};

function initialTopology(): { nodes: PonNode[]; edges: PonEdge[] } {
  return buildPreset('standard-1x32') ?? { nodes: [], edges: [] };
}

/* ========================================================================== *
 * Studio workspace — canvas, drag & drop, selection and simulation wiring.
 * ========================================================================== */

function StudioWorkspace() {
  const seeded = useMemo(initialTopology, []);
  const [nodes, setNodes, onNodesChange] = useNodesState<PonNode>(seeded.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<PonEdge>(seeded.edges);
  const [settings, setSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const [activePresetId, setActivePresetId] = useState<string | null>('standard-1x32');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [bomOpen, setBomOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [committedSim, setCommittedSim] = useState<SimulationResult | null>(null);

  const { screenToFlowPosition, deleteElements, fitView, getNodes } = useReactFlow<PonNode, PonEdge>();

  /* --------------------------- Simulation core --------------------------- */

  const liveSimulation = useMemo(
    () => simulateTopology(nodes, edges, settings, 0),
    [nodes, edges, settings],
  );

  const simulation = settings.autoRun ? liveSimulation : (committedSim ?? liveSimulation);

  const flowEdges = useMemo(
    () => decorateEdges(edges, simulation.edgeTelemetry),
    [edges, simulation],
  );

  const runLightTest = useCallback(() => {
    setTesting(true);
    const result = simulateTopology(nodes, edges, settings, Date.now());
    setCommittedSim(result);
    setDirty(false);
    window.setTimeout(() => setTesting(false), 700);
  }, [nodes, edges, settings]);

  /* ------------------------------ Mutations ------------------------------ */

  const markDirty = useCallback(() => setDirty(true), []);

  const handlePatchNode = useCallback(
    (nodeId: string, patch: Partial<AnyNodeData>) => {
      setNodes((current) =>
        current.map((node) => {
          if (node.id !== nodeId) return node;
          const nextData = {
            ...(node.data as Record<string, unknown>),
            ...(patch as Record<string, unknown>),
          };
          return { ...node, data: nextData } as PonNode;
        }),
      );

      // Shrinking a splitter removes physical ports — prune dangling patch cords.
      const ratio = patch.ratio;
      if (typeof ratio === 'number') {
        const portCount = SPLITTER_OUTPUT_PORTS[ratio as SplitRatio];
        setEdges((current) =>
          current.filter((edge) => {
            if (edge.source !== nodeId) return true;
            const handle = edge.sourceHandle ?? '';
            if (!handle.startsWith('out-')) return true;
            const index = Number(handle.slice(4));
            return !Number.isFinite(index) || index < portCount;
          }),
        );
      }
      markDirty();
    },
    [setNodes, setEdges, markDirty],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      void deleteElements({ nodes: [{ id: nodeId }] });
      setSelectedNodeId(null);
      markDirty();
    },
    [deleteElements, markDirty],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      void deleteElements({ edges: [{ id: edgeId }] });
      setSelectedEdgeId(null);
      markDirty();
    },
    [deleteElements, markDirty],
  );

  const addComponent = useCallback(
    (payload: ToolboxPayload, position: { x: number; y: number }) => {
      const kind = payload.component;
      const size = NODE_SIZES[kind];
      const centered = {
        x: position.x - size.width / 2,
        y: position.y - size.height / 2,
      };

      let node: PonNode;
      if (kind === 'olt') {
        node = createOltNode({ position: centered });
      } else if (kind === 'splitter') {
        node = createSplitterNode(payload.ratio ?? 8, { position: centered });
      } else if (kind === 'fiber') {
        node = createFiberNode(payload.cableType ?? 'distribution', { position: centered });
      } else {
        node = createOntNode({ position: centered });
      }

      setNodes((current) => [...current, node]);
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
      setActivePresetId(null);
      markDirty();
    },
    [setNodes, markDirty],
  );

  const handleQuickAdd = useCallback(
    (payload: ToolboxPayload) => {
      // Double-click placement: drop the element to the right of the current view centre.
      const spread = Math.random() * 120 - 60;
      addComponent(payload, { x: 420 + spread, y: 300 + spread });
    },
    [addComponent],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const source = connection.source;
      const target = connection.target;
      if (!source || !target || source === target) return;

      const currentNodes = getNodes();
      const targetNode = currentNodes.find((node) => node.id === target);
      const sourceNode = currentNodes.find((node) => node.id === source);

      setEdges((currentEdges) => {
        // Never duplicate an identical patch cord.
        if (
          currentEdges.some(
            (edge) =>
              edge.source === source &&
              edge.target === target &&
              edge.sourceHandle === connection.sourceHandle &&
              edge.targetHandle === connection.targetHandle,
          )
        ) {
          return currentEdges;
        }

        const nextEdge: PonEdge = {
          id: nextId('patch'),
          source,
          target,
          sourceHandle: connection.sourceHandle ?? null,
          targetHandle: connection.targetHandle ?? 'in',
          type: 'optical',
        };

        let filtered = currentEdges;
        // An ONT has a single PON port: a new drop replaces the previous one.
        if (targetNode && isOntNode(targetNode)) {
          filtered = filtered.filter((edge) => edge.target !== target);
        }
        // An OLT port or a cable span has a single output.
        if (sourceNode && (isOltNode(sourceNode) || isFiberNode(sourceNode))) {
          filtered = filtered.filter((edge) => edge.source !== source);
        }
        return [...filtered, nextEdge];
      });
      markDirty();
    },
    [getNodes, setEdges, markDirty],
  );

  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSelectedNodeId(params.nodes.length === 1 ? params.nodes[0].id : null);
    setSelectedEdgeId(params.edges.length === 1 ? params.edges[0].id : null);
  }, []);

  const applyPreset = useCallback(
    (presetId: string) => {
      const built = buildPreset(presetId);
      if (!built) return;
      setNodes(built.nodes);
      setEdges(built.edges);
      setActivePresetId(presetId);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setDirty(false);
      window.requestAnimationFrame(() => {
        void fitView({ padding: 0.16, duration: 450 });
      });
    },
    [setNodes, setEdges, fitView],
  );

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setActivePresetId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    markDirty();
  }, [setNodes, setEdges, markDirty]);

  const handleSettingsChange = useCallback(
    (patch: Partial<DesignSettings>) => {
      setSettings((current) => ({ ...current, ...patch }));
      markDirty();
    },
    [markDirty],
  );

  /* ------------------------------ Drag & drop ---------------------------- */

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData(DND_MIME) || event.dataTransfer.getData('text/plain');
      if (!raw) return;

      let payload: ToolboxPayload;
      try {
        payload = JSON.parse(raw) as ToolboxPayload;
      } catch {
        return;
      }

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addComponent(payload, position);
    },
    [screenToFlowPosition, addComponent],
  );

  const handleInit = useCallback(
    (instance: ReactFlowInstance<PonNode, PonEdge>) => {
      void instance.fitView({ padding: 0.16 });
    },
    [],
  );

  /* -------------------------------- Selection ---------------------------- */

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const summary = simulation.summary;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-noc-950">
      <TopBar
        summary={summary}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onPreset={applyPreset}
        onRunTest={runLightTest}
        onOpenBOM={() => setBomOpen(true)}
        onClear={clearCanvas}
        testing={testing}
        stale={!settings.autoRun && dirty}
        activePresetId={activePresetId}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar onQuickAdd={handleQuickAdd} />

        <main className="relative min-w-0 flex-1">
          <SimulationContext.Provider value={simulation}>
            <ReactFlow<PonNode, PonEdge>
              nodes={nodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onSelectionChange={handleSelectionChange}
              onInit={handleInit}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              deleteKeyCode={['Backspace', 'Delete']}
              minZoom={0.2}
              maxZoom={2.2}
              fitView
              proOptions={{ hideAttribution: true }}
              className="bg-noc-950"
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#1c2540" />
              <Controls position="bottom-right" showInteractive={false} />
              <MiniMap
                position="top-right"
                pannable
                zoomable
                className="!h-[120px] !w-[180px]"
                nodeColor={(node) => MINIMAP_COLORS[node.type ?? ''] ?? '#3b4867'}
                nodeStrokeWidth={2}
                maskColor="rgba(5,7,13,0.72)"
              />

              <Panel position="bottom-left" className="!m-3">
                <div className="panel rounded-lg px-3 py-2 shadow-panel">
                  <div className="eyebrow mb-1.5">Live optical telemetry</div>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-noc-400">
                      Plant <span className="text-sky-300">{summary.totalFiberKm.toFixed(2)} km</span>
                    </span>
                    <span className="text-noc-400">
                      Splitters <span className="text-purple-300">{summary.splitterTotal}</span>
                    </span>
                    <span className="text-noc-400">
                      ONTs <span className="text-noc-200">{summary.ontCount}</span>
                    </span>
                    <span className="text-noc-400">
                      Mean Rx{' '}
                      <span className="text-emerald-300">{formatDbm(summary.meanRxDbm)}</span>
                    </span>
                    <span className="text-noc-400">
                      Worst Rx{' '}
                      <span
                        className={
                          summary.worstRxDbm !== null && summary.worstRxDbm < -28
                            ? 'text-red-300'
                            : 'text-amber-300'
                        }
                      >
                        {formatDbm(summary.worstRxDbm)}
                      </span>
                    </span>
                  </div>
                </div>
              </Panel>

              {nodes.length === 0 ? (
                <Panel position="top-center" className="!m-6">
                  <div className="panel flex items-center gap-2.5 rounded-lg px-4 py-3 shadow-panel">
                    <MousePointer2 size={16} className="text-sky-300" />
                    <div>
                      <div className="text-[12px] font-semibold text-noc-200">
                        The canvas is empty
                      </div>
                      <div className="text-[11px] text-noc-400">
                        Drag an OLT from the toolbox to start designing your PON.
                      </div>
                    </div>
                  </div>
                </Panel>
              ) : null}
            </ReactFlow>
          </SimulationContext.Provider>
        </main>

        <Inspector
          node={selectedNode}
          edge={selectedEdge}
          simulation={simulation}
          onPatchNode={handlePatchNode}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
          onClose={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setNodes((current) => current.map((node) => ({ ...node, selected: false })));
            setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
          }}
        />
      </div>

      <BOMModal
        open={bomOpen}
        onClose={() => setBomOpen(false)}
        nodes={nodes}
        edges={flowEdges}
        simulation={simulation}
        settings={settings}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <StudioWorkspace />
    </ReactFlowProvider>
  );
}

export { StudioWorkspace };
