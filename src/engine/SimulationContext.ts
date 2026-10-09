import { createContext, useContext } from 'react';
import type { SimulationResult } from '../types';

/** Simulation telemetry is broadcast through context so custom nodes can read
 *  their live optical readings without the node data being rewritten each run. */
export const SimulationContext = createContext<SimulationResult | null>(null);

export function useSimulation(): SimulationResult | null {
  return useContext(SimulationContext);
}
