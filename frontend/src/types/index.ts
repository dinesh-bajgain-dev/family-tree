export interface User {
  id: number
  email: string
  full_name: string
  avatar: string | null
  date_joined: string
}

export type TreePrivacy = 'public' | 'private' | 'family_only'

export interface FamilyTree {
  id: string
  owner: number
  name: string
  description: string
  cover_image: string | null
  privacy: TreePrivacy
  member_count: number
  created_at: string
  updated_at: string
}

export type Gender = 'male' | 'female' | 'other' | ''
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | ''

export interface FamilyMember {
  id: string
  tree: string
  full_name: string
  nickname: string
  gender: Gender
  date_of_birth: string | null
  place_of_birth: string
  nationality: string
  occupation: string
  education: string
  biography: string
  blood_group: BloodGroup
  religion: string
  is_living: boolean
  date_of_death: string | null
  burial_location: string
  notes: string
  profile_photo: string | null
  created_at: string
  updated_at: string
}

export type RelationshipKind = 'parent_child' | 'spouse' | 'sibling'
export type ParentLinkType = 'biological' | 'adopted' | 'step' | 'guardian' | ''
export type SpouseStatus = 'current' | 'divorced' | 'deceased' | ''

export interface Relationship {
  id: string
  tree: string
  kind: RelationshipKind
  from_member: string
  to_member: string
  parent_link_type: ParentLinkType
  spouse_status: SpouseStatus
  marriage_order: number
  created_at: string
}

export interface GraphEdge {
  id: string
  kind: RelationshipKind
  from_member: string
  to_member: string
  parent_link_type: ParentLinkType
  spouse_status: SpouseStatus
}

export interface TreeGraph {
  nodes: FamilyMember[]
  edges: GraphEdge[]
}

export interface RelationshipPathResult {
  relationship: string | null
  path: string[] | null
}
