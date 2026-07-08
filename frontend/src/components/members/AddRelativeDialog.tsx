import { useState } from 'react'
import type { FamilyMember, ParentLinkType, SpouseStatus } from '../../types'
import { membersApi, relationshipsApi } from '../../lib/treeApi'
import { Button } from '../ui/Button'
import { Select } from '../ui/Input'
import { MemberForm, type MemberFormValues } from './MemberForm'

type RelativeKind = 'parent' | 'child' | 'spouse'

interface AddRelativeDialogProps {
  treeId: string
  currentMember: FamilyMember
  existingMembers: FamilyMember[]
  onDone: () => void
}

export function AddRelativeDialog({
  treeId,
  currentMember,
  existingMembers,
  onDone,
}: AddRelativeDialogProps) {
  const [relativeKind, setRelativeKind] = useState<RelativeKind>('parent')
  const [parentLinkType, setParentLinkType] = useState<ParentLinkType>('biological')
  const [spouseStatus, setSpouseStatus] = useState<SpouseStatus>('current')
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [existingId, setExistingId] = useState('')

  const candidateOptions = existingMembers.filter((m) => m.id !== currentMember.id)

  async function linkRelative(relativeMemberId: string) {
    if (relativeKind === 'parent') {
      await relationshipsApi.create(treeId, {
        kind: 'parent_child',
        from_member: relativeMemberId,
        to_member: currentMember.id,
        parent_link_type: parentLinkType,
      })
    } else if (relativeKind === 'child') {
      await relationshipsApi.create(treeId, {
        kind: 'parent_child',
        from_member: currentMember.id,
        to_member: relativeMemberId,
        parent_link_type: parentLinkType,
      })
    } else {
      await relationshipsApi.create(treeId, {
        kind: 'spouse',
        from_member: currentMember.id,
        to_member: relativeMemberId,
        spouse_status: spouseStatus,
      })
    }
    onDone()
  }

  async function handleCreateNew(values: MemberFormValues) {
    const created = await membersApi.create(treeId, values)
    await linkRelative(created.id)
  }

  async function handleLinkExisting() {
    if (existingId) await linkRelative(existingId)
  }

  return (
    <div className="flex flex-col gap-5">
      <Select
        label="Relation to this person"
        value={relativeKind}
        onChange={(e) => setRelativeKind(e.target.value as RelativeKind)}
      >
        <option value="parent">Parent</option>
        <option value="child">Child</option>
        <option value="spouse">Spouse / partner</option>
      </Select>

      {relativeKind !== 'spouse' ? (
        <Select
          label="Link type"
          value={parentLinkType}
          onChange={(e) => setParentLinkType(e.target.value as ParentLinkType)}
        >
          <option value="biological">Biological</option>
          <option value="adopted">Adopted</option>
          <option value="step">Step-parent</option>
          <option value="guardian">Guardian</option>
        </Select>
      ) : (
        <Select
          label="Marriage status"
          value={spouseStatus}
          onChange={(e) => setSpouseStatus(e.target.value as SpouseStatus)}
        >
          <option value="current">Current</option>
          <option value="divorced">Divorced</option>
          <option value="deceased">Deceased spouse</option>
        </Select>
      )}

      <div className="flex gap-2">
        <Button variant={mode === 'new' ? 'primary' : 'secondary'} onClick={() => setMode('new')} type="button">
          New person
        </Button>
        <Button
          variant={mode === 'existing' ? 'primary' : 'secondary'}
          onClick={() => setMode('existing')}
          type="button"
        >
          Existing member
        </Button>
      </div>

      {mode === 'new' ? (
        <MemberForm onSubmit={handleCreateNew} submitLabel="Add relative" />
      ) : (
        <div className="flex flex-col gap-3">
          <Select label="Choose member" value={existingId} onChange={(e) => setExistingId(e.target.value)}>
            <option value="">Select…</option>
            {candidateOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </Select>
          <Button onClick={handleLinkExisting} disabled={!existingId} className="self-start">
            Link relative
          </Button>
        </div>
      )}
    </div>
  )
}
