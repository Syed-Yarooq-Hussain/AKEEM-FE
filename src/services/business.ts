import { apiRequest } from './api'

export type ApiRecord=Record<string,unknown>
export type ListData={items?:ApiRecord[];pagination?:Record<string,number>}
export type OrganizationRole={id:number;name:string;description?:string;isSystem?:boolean}
export type PipelineStage={id:number;pipelineId:number;name:string;position:number;probability:number;color?:string}
export type CrmPipeline={id:number;name:string;isDefault?:boolean;stages:PipelineStage[]}
const items=(data:unknown):ApiRecord[]=>Array.isArray(data)?data:(data&&typeof data==='object'&&Array.isArray((data as ListData).items)?(data as ListData).items!:[])

export async function listApprovals(projectId?:number){return items(await apiRequest(`/approvals?${projectId?`projectId=${projectId}`:''}`))}
export const approve=(id:number,comment='Approved')=>apiRequest(`/approvals/${id}/approve`,{method:'POST',body:JSON.stringify({comment})})
export const reject=(id:number,comment='Rejected')=>apiRequest(`/approvals/${id}/reject`,{method:'POST',body:JSON.stringify({comment})})
export async function listAutomations(projectId?:number){return items(await apiRequest(`/automations?${projectId?`projectId=${projectId}`:''}`))}
export const runAutomation=(id:number)=>apiRequest(`/automations/${id}/run`,{method:'POST'})
export const automationRuns=(id:number)=>apiRequest(`/automations/${id}/runs`)
export async function crmOverview(){return apiRequest<ApiRecord>('/crm/overview')}
export async function crmList(resource:'contacts'|'companies'|'deals'){return items(await apiRequest(`/crm/${resource}`))}
export async function crmPipelines():Promise<CrmPipeline[]>{const data=await apiRequest<CrmPipeline|CrmPipeline[]|{items?:CrmPipeline[]}>('/crm/pipelines');if(Array.isArray(data))return data;if('items'in data&&Array.isArray(data.items))return data.items;return[data as CrmPipeline]}
export const updateDealStage=(id:number,stage:string)=>apiRequest(`/crm/deals/${id}/stage`,{method:'PATCH',body:JSON.stringify({stage})})
export const financeOverview=(projectId?:number)=>apiRequest<ApiRecord>(`/finance/overview${projectId?`?projectId=${projectId}`:''}`)
export async function financeList(resource:'transactions'|'invoices'|'budgets'|'cash-flow'|'reports'){const data=await apiRequest(`/finance/${resource}`);return items(data).length?items(data):data}
export const organization=()=>apiRequest<ApiRecord>('/organization')
export async function organizationMembers(){return items(await apiRequest('/organization/members'))}
export const organizationRoles=()=>apiRequest<OrganizationRole[]>('/organization/roles')
export const userProfile=()=>apiRequest<ApiRecord>('/users/me')
export async function adminList(resource:'users'|'audit-logs'|'integrations'){return items(await apiRequest(`/admin/${resource}`))}
export const adminUsage=(period?:string)=>apiRequest<ApiRecord>(`/admin/usage${period?`?period=${period}`:''}`)
