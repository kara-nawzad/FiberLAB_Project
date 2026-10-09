import type { NodeTypes } from '@xyflow/react';
import { OLTNode } from './OLTNode';
import { SplitterNode } from './SplitterNode';
import { FiberNode } from './FiberNode';
import { ONTNode } from './ONTNode';

/** Registry handed to <ReactFlow nodeTypes={...} />. Declared at module scope
 *  so React Flow never sees a new object identity between renders. */
export const nodeTypes = {
  olt: OLTNode,
  splitter: SplitterNode,
  fiber: FiberNode,
  ont: ONTNode,
} satisfies NodeTypes;

export { OLTNode, SplitterNode, FiberNode, ONTNode };
