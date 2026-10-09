import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';

/**
 * End-to-end smoke test of the studio shell: it mounts the whole app, proves the
 * preset topology renders onto the canvas, proves the simulator's telemetry
 * reaches the ONT node, and proves the BOM modal reports the same plant.
 */
describe('FTTH-Studio application shell', () => {
  it('boots with the standard 1:32 tree and renders every element', async () => {
    render(<App />);

    expect(await screen.findByText(/FTTH/)).toBeInTheDocument();
    expect(screen.getByText('PON 0/1/0')).toBeInTheDocument();
    expect(screen.getByText('1:4 PLC Splitter')).toBeInTheDocument();
    expect(screen.getByText('1:8 PLC Splitter')).toBeInTheDocument();
    expect(screen.getByText('Al-Sulaymaniyah — Unit 12')).toBeInTheDocument();
    expect(screen.getByText('Al-Sulaymaniyah — Unit 14')).toBeInTheDocument();
    expect(screen.getByText('Tanaro Village — Remote')).toBeInTheDocument();
    expect(screen.getByText('Component Toolbox')).toBeInTheDocument();
  });

  it('pushes live optical telemetry into the ONT node', async () => {
    render(<App />);

    const ont = (await screen.findByText('Al-Sulaymaniyah — Unit 12')).closest('.node-shell');
    expect(ont).not.toBeNull();
    expect(within(ont as HTMLElement).getByText('-21.57')).toBeInTheDocument();
    expect(within(ont as HTMLElement).getByText('ONLINE')).toBeInTheDocument();

    // The 6 km drop sits just past the −24 dBm optimal floor.
    const remote = screen.getByText('Tanaro Village — Remote').closest('.node-shell');
    expect(within(remote as HTMLElement).getByText('WARNING')).toBeInTheDocument();
  });

  it('reports the deployed plant in the top bar health strip', async () => {
    render(<App />);
    await screen.findByText('Al-Sulaymaniyah — Unit 12');

    expect(screen.getByText('Marginal links detected')).toBeInTheDocument();
    expect(screen.getByText('13.50 km')).toBeInTheDocument();
  });

  it('opens the Bill of Materials with reconciling totals', async () => {
    render(<App />);
    await screen.findByText('Al-Sulaymaniyah — Unit 12');

    fireEvent.click(screen.getByRole('button', { name: /Bill of Materials/i }));

    expect(await screen.findByText('Deployment summary & per-subscriber optical budget')).toBeInTheDocument();
    // 5 + 1 + 0.3 + 1.2 + 6 km of plant on the canvas.
    expect(screen.getByText('13.50')).toBeInTheDocument();
    // Two wired-optimal + one marginal = 3 online, 0 offline.
    expect(screen.getByText('ONTs provisioned')).toBeInTheDocument();
    expect(screen.queryByText('Dukan Ridge — Tower 7')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close bill of materials' }));
    expect(screen.queryByText('Deployment summary & per-subscriber optical budget')).not.toBeInTheDocument();
  });

  it('opens the inspector for a selected ONT with its full link budget', async () => {
    render(<App />);
    const label = await screen.findByText('Al-Sulaymaniyah — Unit 12');

    const wrapper = label.closest('.react-flow__node');
    expect(wrapper).not.toBeNull();
    fireEvent.click(wrapper as HTMLElement);

    expect(await screen.findByText('Link budget breakdown')).toBeInTheDocument();
    expect(screen.getByText('P_rx = P_tx − ΣL − margin')).toBeInTheDocument();
    expect(screen.getByText(/System safety margin/)).toBeInTheDocument();
    expect(screen.getByText('ONT serial number')).toBeInTheDocument();
  });

  it('clears the canvas and shows the empty-state hint', async () => {
    render(<App />);
    await screen.findByText('Al-Sulaymaniyah — Unit 12');

    fireEvent.click(screen.getByRole('button', { name: /Clear Canvas/i }));

    expect(screen.queryByText('Al-Sulaymaniyah — Unit 12')).not.toBeInTheDocument();
    expect(await screen.findByText('The canvas is empty')).toBeInTheDocument();
  });

  it('loads the failing long-haul preset and turns the health strip red', async () => {
    render(<App />);
    await screen.findByText('Al-Sulaymaniyah — Unit 12');

    fireEvent.click(screen.getByRole('button', { name: /Preset Topologies/i }));
    fireEvent.click(await screen.findByText('Failing Long-Distance Link'));

    expect(await screen.findByText('Dukan Ridge — Tower 7')).toBeInTheDocument();
    expect(await screen.findByText('Fault on the network')).toBeInTheDocument();

    const ont = screen.getByText('Dukan Ridge — Tower 7').closest('.node-shell');
    expect(within(ont as HTMLElement).getByText('LOS')).toBeInTheDocument();
    expect(within(ont as HTMLElement).getByText('-39.47')).toBeInTheDocument();
  });
});
