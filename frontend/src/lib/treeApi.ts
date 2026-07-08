import { api } from './api'
import type {
  FamilyMember,
  FamilyTree,
  Relationship,
  RelationshipPathResult,
  TreeGraph,
} from '../types'

export const treesApi = {
  list: () => api.get<FamilyTree[]>('/trees/').then((r) => r.data),
  get: (id: string) => api.get<FamilyTree>(`/trees/${id}/`).then((r) => r.data),
  create: (data: Partial<FamilyTree>) => api.post<FamilyTree>('/trees/', data).then((r) => r.data),
  update: (id: string, data: Partial<FamilyTree>) =>
    api.patch<FamilyTree>(`/trees/${id}/`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/trees/${id}/`),
}

export const membersApi = {
  list: (treeId: string) =>
    api.get<FamilyMember[]>(`/trees/${treeId}/members/`).then((r) => r.data),
  create: (treeId: string, data: Partial<FamilyMember>) =>
    api.post<FamilyMember>(`/trees/${treeId}/members/`, data).then((r) => r.data),
  update: (treeId: string, memberId: string, data: Partial<FamilyMember>) =>
    api.patch<FamilyMember>(`/trees/${treeId}/members/${memberId}/`, data).then((r) => r.data),
  remove: (treeId: string, memberId: string) =>
    api.delete(`/trees/${treeId}/members/${memberId}/`),
}

export const relationshipsApi = {
  create: (treeId: string, data: Partial<Relationship>) =>
    api.post<Relationship>(`/trees/${treeId}/relationships/`, data).then((r) => r.data),
  remove: (treeId: string, relationshipId: string) =>
    api.delete(`/trees/${treeId}/relationships/${relationshipId}/`),
  path: (treeId: string, fromId: string, toId: string) =>
    api
      .get<RelationshipPathResult>(`/trees/${treeId}/relationship-path/`, {
        params: { from: fromId, to: toId },
      })
      .then((r) => r.data),
}

export const graphApi = {
  get: (treeId: string) => api.get<TreeGraph>(`/trees/${treeId}/graph/`).then((r) => r.data),
}
