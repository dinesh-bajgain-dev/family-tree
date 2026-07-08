import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { FamilyTree, TreeGraph } from '../types'
import { graphApi, membersApi, treesApi } from '../lib/treeApi'
import { FamilyTreeCanvas } from '../components/tree/FamilyTreeCanvas'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { MemberForm, type MemberFormValues } from '../components/members/MemberForm'

export function TreeViewPage() {
  const { treeId } = useParams<{ treeId: string }>()
  const navigate = useNavigate()
  const [tree, setTree] = useState<FamilyTree | null>(null)
  const [graph, setGraph] = useState<TreeGraph | null>(null)
  const [isAddingMember, setIsAddingMember] = useState(false)

  async function refresh() {
    if (!treeId) return
    const [treeData, graphData] = await Promise.all([treesApi.get(treeId), graphApi.get(treeId)])
    setTree(treeData)
    setGraph(graphData)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId])

  async function handleAddMember(values: MemberFormValues) {
    if (!treeId) return
    await membersApi.create(treeId, values)
    setIsAddingMember(false)
    await refresh()
  }

  if (!tree || !graph || !treeId) return <p className="text-sm text-ink-500">Loading…</p>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link to="/trees" className="text-sm text-brand-600 hover:underline">
            ← All trees
          </Link>
          <h1 className="text-2xl font-semibold">{tree.name}</h1>
        </div>
        <Button onClick={() => setIsAddingMember(true)}>+ Add member</Button>
      </div>

      {graph.nodes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-300 p-12 text-center text-ink-500 dark:border-ink-700">
          <p className="mb-4">No members yet — add the first person in this tree.</p>
          <Button onClick={() => setIsAddingMember(true)}>+ Add member</Button>
        </div>
      ) : (
        <FamilyTreeCanvas
          treeId={treeId}
          graph={graph}
          onSelectMember={(memberId) => navigate(`/trees/${treeId}/members/${memberId}`)}
        />
      )}

      <Modal open={isAddingMember} onClose={() => setIsAddingMember(false)} title="Add a family member">
        <MemberForm onSubmit={handleAddMember} submitLabel="Add member" />
      </Modal>
    </div>
  )
}
