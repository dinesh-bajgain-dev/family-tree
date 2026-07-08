import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { TreeGraph } from '../types'
import { graphApi, membersApi, relationshipsApi } from '../lib/treeApi'
import { adToBs, BS_MONTH_NAMES } from '../lib/nepaliDate'
import { initials } from '../lib/initials'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { MemberForm, type MemberFormValues } from '../components/members/MemberForm'
import { AddRelativeDialog } from '../components/members/AddRelativeDialog'

const RELATION_LABELS: Record<string, string> = {
  parent_child: 'Parent / Child',
  spouse: 'Spouse',
}

function bsLabel(adIso?: string | null): string | undefined {
  if (!adIso) return undefined
  const bs = adToBs(adIso)
  if (!bs) return undefined
  return `BS ${bs.date} ${BS_MONTH_NAMES[bs.month - 1]} ${bs.year}`
}

export function MemberProfilePage() {
  const { treeId, memberId } = useParams<{ treeId: string; memberId: string }>()
  const navigate = useNavigate()
  const [graph, setGraph] = useState<TreeGraph | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isAddingRelative, setIsAddingRelative] = useState(false)

  async function refresh() {
    if (!treeId) return
    setGraph(await graphApi.get(treeId))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId])

  if (!graph || !treeId || !memberId) return <p className="text-sm text-ink-500">Loading…</p>

  const member = graph.nodes.find((m) => m.id === memberId)
  if (!member) return <p className="text-sm text-ink-500">Member not found.</p>

  const memberById = new Map(graph.nodes.map((m) => [m.id, m]))
  const directRelations = graph.edges
    .filter((e) => e.from_member === memberId || e.to_member === memberId)
    .map((e) => {
      const otherId = e.from_member === memberId ? e.to_member : e.from_member
      const other = memberById.get(otherId)
      const isFromMember = e.from_member === memberId
      let label = RELATION_LABELS[e.kind]
      if (e.kind === 'parent_child') label = isFromMember ? 'Child' : 'Parent'
      if (e.kind === 'spouse') label = 'Spouse'
      return { other, label, edge: e }
    })
    .filter((r) => r.other)

  async function handleUpdate(values: MemberFormValues | FormData) {
    await membersApi.update(treeId!, memberId!, values)
    setIsEditing(false)
    await refresh()
  }

  async function handleDelete() {
    if (!confirm(`Remove ${member!.full_name} from this tree? This cannot be undone.`)) return
    await membersApi.remove(treeId!, memberId!)
    navigate(`/trees/${treeId}`)
  }

  async function handleUnlinkRelative(relationshipId: string, otherName: string) {
    if (!confirm(`Remove ${otherName} as a relative? This only removes the relationship, not the person.`)) return
    await relationshipsApi.remove(treeId!, relationshipId)
    await refresh()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/trees/${treeId}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to tree
      </Link>

      <Card className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-lg font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              {member.profile_photo ? (
                <img src={member.profile_photo} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(member.full_name || '?')
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{member.full_name}</h1>
              {member.nickname && <p className="text-sm text-ink-500">"{member.nickname}"</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Field label="Gender" value={member.gender} />
          <Field label="Born" value={member.date_of_birth} hint={bsLabel(member.date_of_birth)} />
          <Field label="Place of birth" value={member.place_of_birth} />
          <Field label="Nationality" value={member.nationality} />
          <Field label="Occupation" value={member.occupation} />
          <Field label="Education" value={member.education} />
          <Field label="Blood group" value={member.blood_group} />
          <Field label="Religion" value={member.religion} />
          <Field label="Status" value={member.is_living ? 'Living' : 'Deceased'} />
          {!member.is_living && (
            <Field label="Date of death" value={member.date_of_death} hint={bsLabel(member.date_of_death)} />
          )}
          {!member.is_living && <Field label="Burial location" value={member.burial_location} />}
        </dl>

        {member.biography && (
          <div className="mt-4">
            <h3 className="mb-1 text-sm font-semibold text-ink-700 dark:text-ink-200">Biography</h3>
            <p className="text-sm text-ink-600 dark:text-ink-300">{member.biography}</p>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-200">Relatives</h3>
            <Button onClick={() => setIsAddingRelative(true)}>+ Add relative</Button>
          </div>
          {directRelations.length === 0 ? (
            <p className="text-sm text-ink-500">No relatives linked yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {directRelations.map(({ other, label, edge }) => (
                <li
                  key={edge.id}
                  className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700"
                >
                  <Link
                    to={`/trees/${treeId}/members/${other!.id}`}
                    className="flex flex-1 items-center justify-between hover:underline"
                  >
                    <span>{other!.full_name}</span>
                    <span className="mr-3 text-xs text-ink-400">{label}</span>
                  </Link>
                  <button
                    onClick={() => handleUnlinkRelative(edge.id, other!.full_name)}
                    aria-label={`Remove ${other!.full_name} as a relative`}
                    className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-red-500 dark:hover:bg-ink-800"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Modal open={isEditing} onClose={() => setIsEditing(false)} title="Edit member">
        <MemberForm initialValues={member} onSubmit={handleUpdate} submitLabel="Save changes" />
      </Modal>

      <Modal open={isAddingRelative} onClose={() => setIsAddingRelative(false)} title="Add a relative">
        <AddRelativeDialog
          treeId={treeId}
          currentMember={member}
          existingMembers={graph.nodes}
          onDone={() => {
            setIsAddingRelative(false)
            refresh()
          }}
        />
      </Modal>
    </div>
  )
}

function Field({ label, value, hint }: { label: string; value?: string | null; hint?: string }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="text-ink-800 dark:text-ink-200">
        {value}
        {hint && <span className="ml-1.5 text-xs text-ink-400">({hint})</span>}
      </dd>
    </div>
  )
}
