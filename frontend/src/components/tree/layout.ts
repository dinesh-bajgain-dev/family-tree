import type { Edge, Node } from '@xyflow/react'
import type { FamilyMember, GraphEdge } from '../../types'
import { JUNCTION_SIZE } from './JunctionNode'

export const NODE_WIDTH = 220
export const NODE_HEIGHT = 96
const SPOUSE_GAP = 24
const CLUSTER_GAP = 60
const RANK_GAP = 120

export type TreeLayout = 'vertical' | 'horizontal'

export function toFlowElements(
  members: FamilyMember[],
  graphEdges: GraphEdge[],
  hiddenMemberIds: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const visibleMembers = members.filter((m) => !hiddenMemberIds.has(m.id))
  const visibleIds = new Set(visibleMembers.map((m) => m.id))

  const nodes: Node[] = visibleMembers.map((member) => ({
    id: member.id,
    type: 'member',
    data: { member },
    position: { x: 0, y: 0 },
  }))

  const edges: Edge[] = graphEdges
    .filter((e) => visibleIds.has(e.from_member) && visibleIds.has(e.to_member))
    .map((e) =>
      e.kind === 'spouse'
        ? {
            id: e.id,
            source: e.from_member,
            target: e.to_member,
            // sourceHandle/targetHandle (left vs right) are assigned after
            // layout, once we know which partner actually ended up on which
            // side — see assignSpouseHandles below.
            type: 'straight',
            animated: false,
            label: '♥',
            labelStyle: { fill: 'var(--color-brand-500)', fontSize: 14 },
            labelBgStyle: { fill: 'transparent' },
            style: { stroke: 'var(--color-brand-300)' },
            data: { kind: e.kind },
          }
        : {
            id: e.id,
            source: e.from_member,
            target: e.to_member,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            type: 'step',
            animated: false,
            style: { stroke: 'var(--color-ink-300)' },
            data: { kind: e.kind },
          },
    )

  return { nodes, edges }
}

/**
 * Spouse edges connect via dedicated left/right handles so the line renders
 * as a clean straight connector between adjacent partners (matching how a
 * real family-tree chart draws couples) instead of routing through the
 * top/bottom handles used for parent/child edges. Which side each partner
 * uses depends on which one ended up left/right after layout, so this runs
 * after node positions are computed.
 */
export function assignSpouseHandles(nodes: Node[], edges: Edge[], layout: TreeLayout): Edge[] {
  if (layout !== 'vertical') return edges
  const xById = new Map(nodes.map((n) => [n.id, n.position.x]))

  return edges.map((edge) => {
    if (edge.data?.kind !== 'spouse') return edge
    const sourceX = xById.get(edge.source) ?? 0
    const targetX = xById.get(edge.target) ?? 0
    return sourceX <= targetX
      ? { ...edge, sourceHandle: 'right-source', targetHandle: 'left-target' }
      : { ...edge, sourceHandle: 'left-source', targetHandle: 'right-target' }
  })
}

/**
 * Family-tree-shaped layered layout: generation (rank) is driven purely by
 * parent/child edges (a longest-path-from-roots BFS), then spouse pairs are
 * synced onto the same rank. dagre's automatic ranking was tried first, but
 * its cycle-breaking preprocessing silently drops the "same rank" constraint
 * a bidirectional zero-length edge is meant to express, so ranks are computed
 * by hand here instead.
 *
 * Horizontal (X) positions are then assigned bottom-up: the deepest
 * generation lays out left-to-right in natural order first, and every
 * shallower generation centers each parent/couple over the mean position of
 * their own children (falling back to natural left-to-right placement for
 * anyone with no children in the tree). This is what makes a couple's
 * marriage line land centered over their children instead of the reverse —
 * positioning children under a fixed parent spot, which only looks centered
 * by coincidence and skews as soon as a child's own subtree (e.g. their
 * spouse) pulls the group's width to one side.
 */
export function applyDagreLayout(nodes: Node[], edges: Edge[], layout: TreeLayout): Node[] {
  const parentsOf = new Map<string, Set<string>>()
  const spousesOf = new Map<string, Set<string>>()

  for (const edge of edges) {
    if (edge.data?.kind === 'spouse') {
      if (!spousesOf.has(edge.source)) spousesOf.set(edge.source, new Set())
      if (!spousesOf.has(edge.target)) spousesOf.set(edge.target, new Set())
      spousesOf.get(edge.source)!.add(edge.target)
      spousesOf.get(edge.target)!.add(edge.source)
    } else {
      if (!parentsOf.has(edge.target)) parentsOf.set(edge.target, new Set())
      parentsOf.get(edge.target)!.add(edge.source)
    }
  }

  const childrenOf = new Map<string, Set<string>>()
  for (const [child, parents] of parentsOf) {
    for (const p of parents) {
      if (!childrenOf.has(p)) childrenOf.set(p, new Set())
      childrenOf.get(p)!.add(child)
    }
  }

  const rank = new Map<string, number>()
  for (const node of nodes) rank.set(node.id, 0)

  // Fixed-point iteration: raise a node's rank to be one below its lowest
  // (i.e. deepest) parent, and sync spouses to the same rank, repeating
  // until stable. Bounded by node count to tolerate any data cycles.
  for (let i = 0; i < nodes.length + 1; i++) {
    let changed = false

    for (const node of nodes) {
      const parents = parentsOf.get(node.id)
      if (!parents || parents.size === 0) continue
      const desired = Math.max(...[...parents].map((p) => rank.get(p) ?? 0)) + 1
      if (desired > (rank.get(node.id) ?? 0)) {
        rank.set(node.id, desired)
        changed = true
      }
    }

    for (const node of nodes) {
      const spouses = spousesOf.get(node.id)
      if (!spouses) continue
      const maxRank = Math.max(rank.get(node.id) ?? 0, ...[...spouses].map((s) => rank.get(s) ?? 0))
      for (const id of [node.id, ...spouses]) {
        if ((rank.get(id) ?? 0) < maxRank) {
          rank.set(id, maxRank)
          changed = true
        }
      }
    }

    if (!changed) break
  }

  const maxRank = Math.max(0, ...[...rank.values()])
  const byRank: string[][] = Array.from({ length: maxRank + 1 }, () => [])
  for (const node of nodes) byRank[rank.get(node.id) ?? 0].push(node.id)

  // Group same-rank spouses into clusters so couples stay adjacent and are
  // positioned/ordered as a single unit. Grouping only depends on rank and
  // spouse relationships, so it can be done up front for every rank, before
  // any X positions exist yet.
  type Cluster = { ids: string[]; originalIndex: number }
  const clustersByRank: Cluster[][] = []
  const originalIndex = new Map(nodes.map((n, i) => [n.id, i]))

  for (let r = 0; r <= maxRank; r++) {
    const visited = new Set<string>()
    const clusters: Cluster[] = []
    for (const id of byRank[r]) {
      if (visited.has(id)) continue
      const partners = [...(spousesOf.get(id) ?? [])].filter(
        (p) => (rank.get(p) ?? 0) === r && !visited.has(p),
      )
      const ids = [id, ...partners]
      ids.forEach((i) => visited.add(i))
      clusters.push({ ids, originalIndex: Math.min(...ids.map((i) => originalIndex.get(i) ?? 0)) })
    }
    clustersByRank.push(clusters)
  }

  const nodeCenterX = new Map<string, number>()

  // Bottom-up: the deepest rank has no children to center over, so it lays
  // out in natural order; every rank above centers each cluster over its own
  // children's mean position (already fixed, since we're going bottom-up),
  // nudging right only if that would overlap the previous cluster.
  for (let r = maxRank; r >= 0; r--) {
    const clusters = clustersByRank[r]

    const withDesired = clusters.map((cluster) => {
      const childCenters = cluster.ids.flatMap((id) =>
        [...(childrenOf.get(id) ?? [])]
          .map((c) => nodeCenterX.get(c))
          .filter((x): x is number => x !== undefined),
      )
      const desired = childCenters.length
        ? childCenters.reduce((a, b) => a + b, 0) / childCenters.length
        : null
      return { cluster, desired }
    })

    withDesired.sort((a, b) => {
      if (a.desired === null && b.desired === null) return a.cluster.originalIndex - b.cluster.originalIndex
      if (a.desired === null) return 1
      if (b.desired === null) return -1
      if (a.desired === b.desired) return a.cluster.originalIndex - b.cluster.originalIndex
      return a.desired - b.desired
    })

    let cursor = 0
    for (const { cluster, desired } of withDesired) {
      const clusterWidth = cluster.ids.length * NODE_WIDTH + (cluster.ids.length - 1) * SPOUSE_GAP
      const minCenter = cursor + clusterWidth / 2
      const center = desired === null ? minCenter : Math.max(desired, minCenter)
      const clusterStart = center - clusterWidth / 2
      cluster.ids.forEach((id, i) => {
        nodeCenterX.set(id, clusterStart + i * (NODE_WIDTH + SPOUSE_GAP) + NODE_WIDTH / 2)
      })
      cursor = clusterStart + clusterWidth + CLUSTER_GAP
    }
  }

  return nodes.map((node) => {
    const r = rank.get(node.id) ?? 0
    const centerX = nodeCenterX.get(node.id) ?? 0
    const centerY = r * (NODE_HEIGHT + RANK_GAP) + NODE_HEIGHT / 2
    const position =
      layout === 'vertical'
        ? { x: centerX - NODE_WIDTH / 2, y: centerY - NODE_HEIGHT / 2 }
        : { x: centerY - NODE_HEIGHT / 2, y: centerX - NODE_WIDTH / 2 }
    return { ...node, position }
  })
}

function makeJunctionNode(id: string, centerX: number, centerY: number): Node {
  return {
    id,
    type: 'junction',
    position: { x: centerX - JUNCTION_SIZE / 2, y: centerY - JUNCTION_SIZE / 2 },
    data: {},
    draggable: false,
    selectable: false,
    zIndex: -1,
  }
}

/**
 * Builds, per distinct parent-set that has at least one child, a two-anchor
 * chain: a "parent drop" positioned at the couple's marriage-line center
 * (or a single parent's own center), and a "bus center" positioned at the
 * horizontal midpoint of that couple's children. Connecting the two with one
 * edge means the trunk still visibly originates from the parents, but the
 * bus it feeds always splits into two equal halves across the children —
 * rather than hanging off the parents' own point, which is only centered
 * over the children by coincidence (e.g. it skews badly once one child's own
 * subtree, like a spouse, pulls the group's width to one side).
 *
 * This replaces individual parent->child edges for rendering (vertical
 * layout only). Children with a different recorded co-parent (e.g.
 * half-siblings from a remarriage) land in a different group and get their
 * own separate trunk+bus.
 */
export function buildJunctionElements(
  positionedNodes: Node[],
  graphEdges: GraphEdge[],
  hiddenMemberIds: Set<string>,
): { junctionNodes: Node[]; edges: Edge[] } {
  const centerById = new Map(
    positionedNodes.map((n) => [n.id, { x: n.position.x + NODE_WIDTH / 2, y: n.position.y + NODE_HEIGHT / 2 }]),
  )

  const parentsOfChild = new Map<string, Set<string>>()
  for (const e of graphEdges) {
    if (e.kind !== 'parent_child') continue
    if (hiddenMemberIds.has(e.from_member) || hiddenMemberIds.has(e.to_member)) continue
    if (!centerById.has(e.from_member) || !centerById.has(e.to_member)) continue
    if (!parentsOfChild.has(e.to_member)) parentsOfChild.set(e.to_member, new Set())
    parentsOfChild.get(e.to_member)!.add(e.from_member)
  }

  const groupByParentKey = new Map<string, { parentIds: string[]; childIds: string[] }>()
  for (const [childId, parentSet] of parentsOfChild) {
    const parentIds = [...parentSet].sort()
    const key = parentIds.join('+')
    if (!groupByParentKey.has(key)) groupByParentKey.set(key, { parentIds, childIds: [] })
    groupByParentKey.get(key)!.childIds.push(childId)
  }

  const junctionNodes: Node[] = []
  const edges: Edge[] = []

  for (const [key, { parentIds, childIds }] of groupByParentKey) {
    const parentCenters = parentIds.map((id) => centerById.get(id)!).filter(Boolean)
    const childCenters = childIds.map((id) => centerById.get(id)!).filter(Boolean)
    if (parentCenters.length === 0 || childCenters.length === 0) continue

    const parentX = parentCenters.reduce((sum, c) => sum + c.x, 0) / parentCenters.length
    const parentY = parentCenters.reduce((sum, c) => sum + c.y, 0) / parentCenters.length
    const childXs = childCenters.map((c) => c.x)
    const busX = (Math.min(...childXs) + Math.max(...childXs)) / 2
    const childY = childCenters.reduce((sum, c) => sum + c.y, 0) / childCenters.length
    const busY = (parentY + childY) / 2

    const dropId = `junction-drop:${key}`
    const busId = `junction-bus:${key}`
    junctionNodes.push(makeJunctionNode(dropId, parentX, parentY))
    junctionNodes.push(makeJunctionNode(busId, busX, busY))

    edges.push({
      id: `pc-stub:${key}`,
      source: dropId,
      target: busId,
      sourceHandle: 'out',
      targetHandle: 'in',
      type: 'step',
      animated: false,
      style: { stroke: 'var(--color-ink-300)' },
      data: { kind: 'parent_child', parentIds, childIds },
    })

    for (const childId of childIds) {
      edges.push({
        id: `pc:${key}->${childId}`,
        source: busId,
        target: childId,
        sourceHandle: 'out',
        targetHandle: 'top',
        type: 'step',
        animated: false,
        style: { stroke: 'var(--color-ink-300)' },
        data: { kind: 'parent_child', parentIds, childIds: [childId] },
      })
    }
  }

  return { junctionNodes, edges }
}
