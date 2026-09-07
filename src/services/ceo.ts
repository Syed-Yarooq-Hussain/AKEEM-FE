import { apiRequest } from './api'
export type CEOChatResponse={conversationId:number;messageId:number;projectId:number;answer:string;model?:string;usage?:{inputTokens?:number;outputTokens?:number};createdAt?:string}
export type CEOMessage={id?:number;role:'ai'|'user';text:string;time:string}
export type CEOConversation={id:number;projectId:number;title:string;lastMessage?:string;messageCount?:number;createdAt:string;updatedAt:string}
export type CEOBriefing={businessHealth:Record<string,unknown>;priorityAction:Record<string,unknown>;boardReadiness:Record<string,unknown>;teamMorale:Record<string,unknown>;generatedAt:string}
export const sendCEOMessage=(payload:{projectId:number;message:string;conversationId?:number})=>apiRequest<CEOChatResponse>('/ai/ceo/chat',{method:'POST',body:JSON.stringify(payload)})
export const getCEOBriefing=(projectId:number)=>apiRequest<CEOBriefing>(`/ai/ceo/briefing?projectId=${projectId}`)
export const getCEOConversations=(projectId:number,page=1,limit=20)=>apiRequest<{items:CEOConversation[]}>(`/ai/ceo/conversations?projectId=${projectId}&page=${page}&limit=${limit}`)
export const deleteCEOConversation=(id:number)=>apiRequest(`/ai/ceo/conversations/${id}`,{method:'DELETE'})
export async function getCEOMessages(conversationId:number):Promise<CEOMessage[]>{const data=await apiRequest<{messages:Record<string,unknown>[]}>(`/ai/ceo/conversations/${conversationId}/messages`);const raw=Array.isArray(data)?data:(data.messages??[]);return raw.map(item=>{const rawRole=String(item.role??item.sender??item.type??'').toLowerCase();const role:'ai'|'user'=['user','human','client'].includes(rawRole)?'user':'ai';const date=item.createdAt?new Date(String(item.createdAt)):null;return{id:typeof item.id==='number'?item.id:undefined,role,text:String(item.content??item.message??item.answer??item.text??''),time:date&&!Number.isNaN(date.getTime())?date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):''}}).filter(message=>message.text)}
