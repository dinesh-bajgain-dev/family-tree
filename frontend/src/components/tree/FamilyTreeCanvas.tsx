import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { TreeGraph } from '../../types'
import {
  applyDagreLayout,
  assignSpouseHandles,
  buildJunctionElements,
  toFlowElements,
  type TreeLayout,
} from './layout'
import { MemberNode } from './MemberNode'
import { JunctionNode } from './JunctionNode'
import { relationshipsApi } from '../../lib/treeApi'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

const nodeTypes = { member: MemberNode, junction: JunctionNode }

interface FamilyTreeCanvasProps {
  treeId: string
  graph: TreeGraph
  onSelectMember: (memberId: string) => void
}

function descendantsOf(memberId: string, graph: TreeGraph): Set<string> {
  const childrenOf = new Map<string, string[]>()
  for (const edge of graph.edges) {
    if (edge.kind !== 'parent_child') continue
    if (!childrenOf.has(edge.from_member)) childrenOf.set(edge.from_member, [])
    childrenOf.get(edge.from_member)!.push(edge.to_member)
  }
  const result = new Set<string>()
  const queue = [...(childrenOf.get(memberId) ?? [])]
  while (queue.length) {
    const current = queue.shift()!
    if (result.has(current)) continue
    result.add(current)
    queue.push(...(childrenOf.get(current) ?? []))
  }
  return result
}

/**
 * Whether an edge represents a step on the highlighted relationship path.
 * Spouse edges (and horizontal-layout parent/child edges, which still
 * connect real members directly) check source/target membership as before.
 * Vertical-layout parent/child edges route through invisible junction nodes
 * instead of a real member (see buildJunctionElements), so those check
 * whether any of the edge's recorded parents AND any of its recorded
 * children are on the path — covering both the per-child fan-out edges and
 * the shared parent-drop->bus-center stub edge, which lists every sibling in
 * the group rather than a single target.
 */
function isEdgeOnPath(edge: Edge, path: string[] | undefined): boolean {
  if (!path) return false
  const parentIds = edge.data?.parentIds
  const childIds = edge.data?.childIds
  if (Array.isArray(parentIds) && Array.isArray(childIds)) {
    return childIds.some((c) => path.includes(c)) && parentIds.some((p) => path.includes(p))
  }
  return path.includes(edge.source) && path.includes(edge.target)
}

function TreeCanvasInner({ treeId, graph, onSelectMember }: FamilyTreeCanvasProps) {
  const [layout, setLayout] = useState<TreeLayout>('vertical')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [pathMode, setPathMode] = useState(false)
  const [pathSelection, setPathSelection] = useState<string[]>([])
  const [pathResult, setPathResult] = useState<{ relationship: string | null; path: string[] } | null>(
    null,
  )
  const { fitView, setCenter, getNode } = useReactFlow()

  const childrenCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const edge of graph.edges) {
      if (edge.kind !== 'parent_child') continue
      counts.set(edge.from_member, (counts.get(edge.from_member) ?? 0) + 1)
    }
    return counts
  }, [graph.edges])

  const hiddenMemberIds = useMemo(() => {
    const hidden = new Set<string>()
    for (const collapsedId of collapsed) {
      for (const id of descendantsOf(collapsedId, graph)) hidden.add(id)
    }
    return hidden
  }, [collapsed, graph])

  const matchingIds = useMemo(() => {
    if (!search.trim()) return new Set<string>()
    const q = search.trim().toLowerCase()
    return new Set(graph.nodes.filter((m) => m.full_name.toLowerCase().includes(q)).map((m) => m.id))
  }, [search, graph.nodes])

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    const { nodes: flowNodes, edges: flowEdges } = toFlowElements(graph.nodes, graph.edges, hiddenMemberIds)
    const positioned = applyDagreLayout(flowNodes, flowEdges, layout)
    const handledEdges = assignSpouseHandles(positioned, flowEdges, layout)

    if (layout === 'vertical') {
      const spouseEdges = handledEdges.filter((e) => e.data?.kind === 'spouse')
      const { junctionNodes, edges: parentChildEdges } = buildJunctionElements(
        positioned,
        graph.edges,
        hiddenMemberIds,
      )
      setNodes([...positioned, ...junctionNodes])
      setEdges([...spouseEdges, ...parentChildEdges])
    } else {
      setNodes(positioned)
      setEdges(handledEdges)
    }

    const timeout = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 350)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, hiddenMemberIds, layout])

  const handleToggleCollapse = useCallback((memberId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }, [])

  async function handleSelect(memberId: string) {
    if (!pathMode) {
      onSelectMember(memberId)
      return
    }
    const next = pathSelection.includes(memberId) ? pathSelection : [...pathSelection, memberId].slice(-2)
    setPathSelection(next)
    if (next.length === 2) {
      const result = await relationshipsApi.path(treeId, next[0], next[1])
      setPathResult({ relationship: result.relationship, path: result.path ?? [] })
    } else {
      setPathResult(null)
    }
  }

  useEffect(() => {
    if (matchingIds.size === 1) {
      const [id] = matchingIds
      const node = getNode(id)
      if (node) setCenter(node.position.x + 110, node.position.y + 48, { zoom: 1.2, duration: 400 })
    }
  }, [matchingIds, getNode, setCenter])

  const decoratedNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      hasChildren: (childrenCount.get(node.id) ?? 0) > 0,
      isCollapsed: collapsed.has(node.id),
      isHighlighted: matchingIds.has(node.id) || pathResult?.path.includes(node.id),
      isSelected: pathSelection.includes(node.id),
      onToggleCollapse: handleToggleCollapse,
      onSelect: handleSelect,
    },
  }))

  const decoratedEdges = edges.map((edge) => ({
    ...edge,
    animated: isEdgeOnPath(edge, pathResult?.path),
    style: isEdgeOnPath(edge, pathResult?.path)
      ? { ...edge.style, stroke: 'var(--color-brand-600)', strokeWidth: 2.5 }
      : edge.style,
  }))

  return (
    <div className="flex h-[70vh] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          variant="secondary"
          onClick={() => setLayout((l) => (l === 'vertical' ? 'horizontal' : 'vertical'))}
        >
          {layout === 'vertical' ? 'Vertical' : 'Horizontal'} layout
        </Button>
        <Button
          variant={pathMode ? 'primary' : 'secondary'}
          onClick={() => {
            setPathMode((v) => !v)
            setPathSelection([])
            setPathResult(null)
          }}
        >
          {pathMode ? 'Exit relationship finder' : 'Find relationship path'}
        </Button>
        {pathMode && (
          <span className="text-sm text-ink-500 dark:text-ink-400">
            {pathSelection.length < 2
              ? 'Select two members…'
              : pathResult?.relationship
                ? `${pathResult.relationship} of one another`
                : 'No known relationship yet.'}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
        <ReactFlow
          nodes={decoratedNodes}
          edges={decoratedEdges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} />
          <Controls />
          <MiniMap
            pannable
            zoomable
            className="!rounded-lg !border !border-ink-200 !bg-ink-100 shadow-md dark:!border-ink-700 dark:!bg-ink-800"
          />
        </ReactFlow>
      </div>
    </div>
  )
}

export function FamilyTreeCanvas(props: FamilyTreeCanvasProps) {
  return (
    <ReactFlowProvider>
      <TreeCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
