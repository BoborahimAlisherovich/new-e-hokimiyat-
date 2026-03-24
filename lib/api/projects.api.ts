import type {
  Project,
  ProjectAttachment,
  ProjectComment,
  ProjectCreateInput,
  ProjectHistory,
  ProjectScope,
  ProjectSummary,
  ProjectUpdateInput,
} from '@/types'

import { fetchApi } from './client'


export async function getProjects(scope: ProjectScope = 'active'): Promise<Project[]> {
  const response = await fetchApi<Project[] | { results?: Project[] }>(`/projects/?scope=${scope}`)
  return Array.isArray(response) ? response : response.results ?? []
}

export async function getProjectsSummary(scope: ProjectScope = 'active'): Promise<ProjectSummary> {
  return fetchApi<ProjectSummary>(`/projects/summary/?scope=${scope}`)
}

export async function createProject(data: ProjectCreateInput): Promise<Project> {
  return fetchApi<Project>('/projects/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateProject(id: number | string, data: ProjectUpdateInput): Promise<Project> {
  return fetchApi<Project>(`/projects/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteProject(id: number | string): Promise<void> {
  return fetchApi<void>(`/projects/${id}/`, { method: 'DELETE' })
}

export async function restoreProject(id: number | string): Promise<Project> {
  return fetchApi<Project>(`/projects/${id}/restore/`, { method: 'POST' })
}

export async function getProjectById(id: number | string): Promise<Project> {
  return fetchApi<Project>(`/projects/${id}/`)
}

export async function getProjectHistory(id: number | string): Promise<ProjectHistory[]> {
  return fetchApi<ProjectHistory[]>(`/projects/${id}/history/`)
}

export async function getProjectComments(id: number | string): Promise<ProjectComment[]> {
  return fetchApi<ProjectComment[]>(`/projects/${id}/comments/`)
}

export async function addProjectComment(id: number | string, message: string): Promise<ProjectComment> {
  return fetchApi<ProjectComment>(`/projects/${id}/comments/`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export async function getProjectAttachments(id: number | string): Promise<ProjectAttachment[]> {
  return fetchApi<ProjectAttachment[]>(`/projects/${id}/attachments/`)
}

export async function uploadProjectAttachment(id: number | string, file: File): Promise<ProjectAttachment> {
  const formData = new FormData()
  formData.append('file', file)
  return fetchApi<ProjectAttachment>(`/projects/${id}/attachments/`, {
    method: 'POST',
    body: formData,
  })
}

export async function getProjectKpi(id: number | string): Promise<{
  project_id: string
  progress: number
  status: string
  timeline: { label: string; progress: number; events: number }[]
}> {
  return fetchApi(`/projects/${id}/kpi/`)
}
