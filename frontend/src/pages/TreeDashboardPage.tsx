import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import { treesApi } from '../lib/treeApi'
import { useAuth } from '../context/AuthContext'
import type { FamilyTree, TreePrivacy } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input, Select, Textarea } from '../components/ui/Input'

export function TreeDashboardPage() {
  const { user } = useAuth()
  const [trees, setTrees] = useState<FamilyTree[] | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  async function refresh() {
    setTrees(await treesApi.list())
  }

  useEffect(() => {
    refresh()
  }, [])

  const myTree = trees?.find((t) => t.owner === user?.id) ?? null
  const publicTrees = trees?.filter((t) => t.owner !== user?.id) ?? []

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Family trees</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            Each account gets one family tree of its own, plus browsing access to everyone else's public trees.
          </p>
        </div>
        {!myTree && (
          <Button onClick={() => setIsCreating((v) => !v)}>
            {isCreating ? 'Cancel' : '+ New tree'}
          </Button>
        )}
      </div>

      {isCreating && !myTree && (
        <CreateTreeForm
          onCreated={() => {
            setIsCreating(false)
            refresh()
          }}
        />
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Your family tree</h2>
        {trees === null ? (
          <p className="text-sm text-ink-500">Loading…</p>
        ) : myTree ? (
          <TreeCard tree={myTree} />
        ) : (
          <Card className="p-8 text-center text-ink-500 dark:text-ink-400">
            You haven't created your family tree yet.
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Explore public family trees</h2>
        {trees === null ? (
          <p className="text-sm text-ink-500">Loading…</p>
        ) : publicTrees.length === 0 ? (
          <Card className="p-8 text-center text-ink-500 dark:text-ink-400">
            No other public family trees yet.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicTrees.map((tree, i) => (
              <TreeCard key={tree.id} tree={tree} delay={i * 0.04} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function TreeCard({ tree, delay = 0 }: { tree: FamilyTree; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay }}>
      <Link to={`/trees/${tree.id}`}>
        <Card className="flex h-full flex-col p-5 transition-transform hover:-translate-y-0.5 hover:shadow-xl">
          <h2 className="mb-1 text-lg font-semibold">{tree.name}</h2>
          <p className="mb-4 line-clamp-2 flex-1 text-sm text-ink-500 dark:text-ink-400">
            {tree.description || 'No description yet.'}
          </p>
          <div className="flex items-center justify-between text-xs text-ink-400">
            <span className="rounded-full bg-brand-100 px-2 py-0.5 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {tree.privacy.replace('_', ' ')}
            </span>
            <span>{tree.member_count} members</span>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}

function CreateTreeForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState<TreePrivacy>('private')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await treesApi.create({ name, description, privacy })
      onCreated()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const messages = Object.values(err.response.data).flat().join(' ')
        setError(messages || 'Could not create the tree.')
      } else {
        setError('Could not create the tree.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mb-6 p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Family name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea
          label="Description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Select label="Privacy" value={privacy} onChange={(e) => setPrivacy(e.target.value as TreePrivacy)}>
          <option value="private">Private</option>
          <option value="family_only">Family only</option>
          <option value="public">Public</option>
        </Select>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" disabled={isSubmitting} className="self-start">
          {isSubmitting ? 'Creating…' : 'Create tree'}
        </Button>
      </form>
    </Card>
  )
}
