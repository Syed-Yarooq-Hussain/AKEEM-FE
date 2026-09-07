import { apiRequest } from './api'

export type Assistant='ceo'|'executive'|'sales'|'finance'|'marketing'|'legal'|'operations'|'customer-success'
export type ChatPayload={projectId:number;message:string;conversationId?:number}
export const sendAssistantMessage=(assistant:Assistant,payload:ChatPayload)=>apiRequest(`/ai/${assistant}/chat`,{method:'POST',body:JSON.stringify(payload)})
export const getAssistantConversations=(assistant:Assistant,projectId:number)=>apiRequest(`/ai/${assistant}/conversations?projectId=${projectId}`)
export const getAssistantMessages=(assistant:Assistant,id:number)=>apiRequest(`/ai/${assistant}/conversations/${id}/messages`)
export const deleteAssistantConversation=(assistant:Assistant,id:number)=>apiRequest(`/ai/${assistant}/conversations/${id}`,{method:'DELETE'})

export type TaskFilters={projectId?:number;status?:string;assistant?:Assistant}
const query=(values:Record<string,string|number|undefined>)=>new URLSearchParams(Object.entries(values).filter((entry):entry is [string,string|number]=>entry[1]!==undefined&&entry[1]!=='').map(([key,value])=>[key,String(value)])).toString()
export const getAITasks=(filters:TaskFilters)=>apiRequest(`/ai/tasks?${query({...filters})}`)
export const createAITask=(payload:Record<string,unknown>)=>apiRequest('/ai/tasks',{method:'POST',body:JSON.stringify(payload)})
export const getAITask=(id:number)=>apiRequest(`/ai/tasks/${id}`)
export const updateAITask=(id:number,payload:Record<string,unknown>)=>apiRequest(`/ai/tasks/${id}`,{method:'PATCH',body:JSON.stringify(payload)})
export const runAITask=(id:number)=>apiRequest(`/ai/tasks/${id}/run`,{method:'POST'})
export const cancelAITask=(id:number)=>apiRequest(`/ai/tasks/${id}/cancel`,{method:'POST'})
export const retryAITask=(id:number)=>apiRequest(`/ai/tasks/${id}/retry`,{method:'POST'})

export const getNotifications=(page=1,limit=20)=>apiRequest(`/notifications?page=${page}&limit=${limit}`)
export const readNotification=(id:number)=>apiRequest(`/notifications/${id}/read`,{method:'PATCH'})
export const readAllNotifications=()=>apiRequest('/notifications/read-all',{method:'POST'})
