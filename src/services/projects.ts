import { apiRequest } from './api'
export type Project={id:number;name:string;description?:string;status?:string;startDate?:string;dueDate?:string;budget?:number;currency?:string;progress?:number}
export type CreateProjectPayload=Omit<Project,'id'|'currency'|'progress'>
type ProjectList={items:Project[];pagination?:{page:number;limit:number;total:number;totalPages:number}}
export async function listProjects(filters:{page?:number;limit?:number;search?:string;status?:string}={}){const query=new URLSearchParams();query.set('page',String(filters.page??1));query.set('limit',String(filters.limit??50));if(filters.search)query.set('search',filters.search);if(filters.status)query.set('status',filters.status);const data=await apiRequest<ProjectList|Project[]>(`/projects?${query}`);return Array.isArray(data)?{items:data}:{items:data.items,pagination:data.pagination}}
export async function getProjects(){return(await listProjects({status:'active'})).items}
export const createProject=(payload:CreateProjectPayload)=>apiRequest<Project>('/projects',{method:'POST',body:JSON.stringify(payload)})
export const getProject=(id:number)=>apiRequest<Project>(`/projects/${id}`)
export const updateProject=(id:number,payload:Partial<CreateProjectPayload>)=>apiRequest<Project>(`/projects/${id}`,{method:'PATCH',body:JSON.stringify(payload)})
export const archiveProject=(id:number)=>apiRequest<Project>(`/projects/${id}`,{method:'DELETE'})
