# FTTH-Studio

A "Tinkercad for Fiber Optics" — visually design a Passive Optical Network on an
interactive canvas, wire it up with optical patch cords, and watch a real-time,
ITU-T compliant optical link budget resolve on every edit.

Built with React 18 + Vite + TypeScript, `@xyflow/react` v12 for the graph canvas,
Tailwind CSS for styling and `lucide-react` for iconography.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build
npm run test       # 28 tests: physics engine + full-app DOM smoke
npm run typecheck  # strict TypeScript, no emit
```

---

## The physics

The simulator walks the directed graph outward from every energised OLT
transceiver and terminates at each ONT it can reach:

```
P_rx = P_tx − (L_fiber + L_splitters + L_splices + L_connectors + Safety_Margin)
```

| Term | Model |
| --- | --- |
| `L_fiber` | `length_km × α` — 0.35 dB/km @ 1310 nm, 0.25 dB/km @ 1490 nm (per-span override supported) |
| `L_splitters` | Catalogue insertion loss: 1:2 = 3.7, 1:4 = 7.2, 1:8 = 10.5, 1:16 = 13.8, 1:32 = 17.5, 1:64 = 20.8 dB (+ optional excess loss) |
| `L_splices` | `count × 0.1 dB` (fusion) |
| `L_connectors` | `count × 0.5 dB` (SC/APC) |
| `Safety_Margin` | Global, default 2.0 dB |

### ONT classification (ITU-T G.984 GPON)

| Status | Condition | Colour |
| --- | --- | --- |
| `OVERLOAD` | `P_rx > −8.0 dBm` | Purple — saturation / burn risk |
| `ONLINE` | `−24.0 ≤ P_rx ≤ −8.0 dBm` | Green |
| `WARNING` | `−28.0 ≤ P_rx < −24.0 dBm` | Amber — high BER risk |
| `LOS` | `P_rx < −28.0 dBm` | Red |
| `DISCONNECTED` | no active OLT path | Grey |

Optical edges are coloured by the light they carry: **green** when live, **red**
when the carried power is below receiver sensitivity, **grey** when idle. Each
edge also labels the power arriving at its far end.

Where a subscriber is reachable from more than one OLT, every path is retained and
the best (highest `P_rx`) one is shown; cycles are traversed once, never looped.

---

## Layout

- **Top bar** — brand + live network health pulse, preset topologies, global safety
  margin, auto-run toggle, `Run Light Test`, `Bill of Materials`, `Clear Canvas`.
- **Left toolbox** — draggable OLT / splitter (1:2 … 1:64) / cable (feeder,
  distribution, drop) / ONT. Drag onto the canvas, or double-click to place.
- **Canvas** — dotted grid, pan/zoom, minimap, custom nodes, animated optical edges.
- **Right inspector** — edit any physical parameter of the selected element or patch
  cord: Tx power, laser state, wavelength, span length, attenuation coefficient,
  splice/connector counts, split ratio, subscriber identity.
- **BOM modal** — deployed fibre, splices, connectors, splitters by ratio, online vs
  offline counts, a per-subscriber optical budget table, and JSON / CSV export.

### Presets

- **Standard 1:32 GPON Tree** — `OLT → 5 km feeder → 1:4 → 1 km distribution → 1:8
  → 300 m drop → ONT`, with two further drops hanging off the 1:8 so the tree shows
  optimal, healthy and marginal subscribers at once. The 300 m subscriber lands at
  **−21.57 dBm (ONLINE)**.
- **Failing Long-Distance Link** — a 1:512 cascade stretched over ~30 km from a
  Class C+ port. Both wired ONTs fall into **LOS (≈ −39.5 dBm)** and a third is left
  unpatched to show **DISCONNECTED**.

---

## Source map

```
src/
├── types.ts                       Domain model, loss catalogues, thresholds, telemetry types
├── engine/
│   ├── opticalSimulator.ts        Graph traversal + loss maths + status classification
│   ├── edgeDecoration.ts          Simulator telemetry → React Flow edge props
│   ├── factories.ts               Node factories and default physical parameters
│   ├── presets.ts                 The two reference topologies
│   ├── SimulationContext.ts       Telemetry broadcast to custom nodes
│   └── __tests__/opticalSimulator.test.ts
├── components/
│   ├── TopBar.tsx  Sidebar.tsx  Inspector.tsx  BOMModal.tsx  OpticalEdge.tsx
│   └── nodes/  OLTNode · SplitterNode · FiberNode · ONTNode · nodeShared
├── App.tsx                        Canvas, drag & drop, selection, simulation wiring
└── __tests__/app.test.tsx         jsdom smoke tests over the mounted application
```

`opticalSimulator.ts` deliberately has no runtime dependency on React or React Flow,
so it runs under a plain Node test environment.
