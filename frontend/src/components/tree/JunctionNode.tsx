import { Handle, Position } from '@xyflow/react'

export const JUNCTION_SIZE = 2

/**
 * Invisible anchor point used to route parent/child connector lines. Two
 * roles share this same component (see buildJunctionElements in layout.ts):
 * a "parent drop" anchored at the couple's marriage-line center, and a "bus
 * center" anchored at the horizontal midpoint of their children, connected
 * to each other by one edge so the bus splits evenly on both sides of the
 * trunk instead of hanging off the parents' own (possibly off-center) point.
 */
export function JunctionNode() {
  return (
    <div style={{ width: JUNCTION_SIZE, height: JUNCTION_SIZE }}>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}
