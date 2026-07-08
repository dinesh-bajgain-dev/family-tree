import type { Edge, Node } from '@xyflow/react'
import type { FamilyMember, GraphEdge } from '../../types'

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
    .map((e) => ({
      id: e.id,
      source: e.from_member,
      target: e.to_member,
      type: 'smoothstep',
      animated: false,
      style:
        e.kind === 'spouse'
          ? { stroke: 'var(--color-brand-400)', strokeDasharray: '4 3' }
          : { stroke: 'var(--color-ink-300)' },
      data: { kind: e.kind },
    }))

  return { nodes, edges }
}

/**
 * Family-tree-shaped layered layout: generation (rank) is driven purely by
 * parent/child edges (a longest-path-from-roots BFS), then spouse pairs are
 * synced onto the same rank. dagre's automatic ranking was tried first, but
 * its cycle-breaking preprocessing silently drops the "same rank" constraint
 * a bidirectional zero-length edge is meant to express, so ranks are computed
 * by hand here instead.
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
  // positioned/ordered as a single unit.
  type Cluster = { ids: string[]; anchorX: number }
  const clustersByRank: Cluster[][] = []
  const nodeCenterX = new Map<string, number>()

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

      const parentXs = ids.flatMap((memberId) =>
        [...(parentsOf.get(memberId) ?? [])]
          .map((p) => nodeCenterX.get(p))
          .filter((x): x is number => x !== undefined),
      )
      const anchorX = parentXs.length
        ? parentXs.reduce((a, b) => a + b, 0) / parentXs.length
        : Number.POSITIVE_INFINITY
      clusters.push({ ids, anchorX })
    }

    // Order by anchor (average parent x) to keep children roughly under
    // their parents; clusters with no parents (e.g. rank 0) keep insertion
    // order via a stable sort.
    const withIndex = clusters.map((c, i) => ({ c, i }))
    withIndex.sort((a, b) => {
      if (a.c.anchorX === b.c.anchorX) return a.i - b.i
      if (!Number.isFinite(a.c.anchorX)) return a.i - b.i
      if (!Number.isFinite(b.c.anchorX)) return a.i - b.i
      return a.c.anchorX - b.c.anchorX
    })
    const ordered = withIndex.map(({ c }) => c)
    clustersByRank.push(ordered)

    let cursor = 0
    for (const cluster of ordered) {
      const clusterWidth = cluster.ids.length * NODE_WIDTH + (cluster.ids.length - 1) * SPOUSE_GAP
      cluster.ids.forEach((id, i) => {
        const x = cursor + i * (NODE_WIDTH + SPOUSE_GAP) + NODE_WIDTH / 2
        nodeCenterX.set(id, x)
      })
      cursor += clusterWidth + CLUSTER_GAP
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
