import { apiRequest } from './api'

export type FileRecord={id:number;projectId?:number;name?:string;originalName?:string;filename?:string;mimeType?:string;size?:number;url?:string;createdAt?:string}
export type ReportRecord={id:number;projectId?:number;title?:string;assistant?:string;format?:string;status?:string;createdAt?:string;updatedAt?:string}
type ListResult<T>={items?:T[]}
const unwrap=<T>(data:T[]|ListResult<T>)=>Array.isArray(data)?data:data.items??[]

export async function listFiles(projectId?:number){const query=new URLSearchParams();if(projectId)query.set('projectId',String(projectId));const data=await apiRequest<FileRecord[]|ListResult<FileRecord>>(`/files${query.size?`?${query}`:''}`);return unwrap(data)}
export async function listReports(projectId?:number,assistant?:string){const query=new URLSearchParams();if(projectId)query.set('projectId',String(projectId));if(assistant)query.set('assistant',assistant);const data=await apiRequest<ReportRecord[]|ListResult<ReportRecord>>(`/reports${query.size?`?${query}`:''}`);return unwrap(data)}
