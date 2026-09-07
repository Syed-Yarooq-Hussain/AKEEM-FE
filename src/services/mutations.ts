import { API_URL, apiRequest } from './api'

export type ApprovalInput={projectId?:number;title:string;type:string;amount?:number;currency?:string;description?:string;metadata?:Record<string,unknown>}
export const createApproval=(payload:ApprovalInput)=>apiRequest('/approvals',{method:'POST',body:JSON.stringify(payload)})

export type AutomationInput={projectId?:number;name:string;description?:string;trigger:{type:string;cron?:string};actions?:Array<Record<string,unknown>>;enabled?:boolean;nextRunAt?:string}
export const createAutomation=(payload:AutomationInput)=>apiRequest('/automations',{method:'POST',body:JSON.stringify(payload)})
export const updateAutomation=(id:number,payload:Partial<AutomationInput>)=>apiRequest(`/automations/${id}`,{method:'PATCH',body:JSON.stringify(payload)})
export const deleteAutomation=(id:number)=>apiRequest(`/automations/${id}`,{method:'DELETE'})

export type CompanyInput={name:string;domain?:string;industry?:string;phone?:string;website?:string;address?:Record<string,unknown>;tags?:string[];customFields?:Record<string,unknown>}
export type ContactInput={companyId?:number;firstName:string;lastName:string;email?:string;phone?:string;jobTitle?:string;lifecycleStage?:string;ownerId?:number;tags?:string[];customFields?:Record<string,unknown>}
export type DealInput={name:string;companyId?:number;contactId?:number;value?:number;currency?:string;ownerId?:number;expectedCloseDate?:string;status?:'open'|'won'|'lost'}
type CrmResource='companies'|'contacts'|'deals'
export const createCrm=(resource:CrmResource,payload:CompanyInput|ContactInput|DealInput)=>apiRequest(`/crm/${resource}`,{method:'POST',body:JSON.stringify(payload)})
export const updateCrm=(resource:CrmResource,id:number,payload:Record<string,unknown>)=>apiRequest(`/crm/${resource}/${id}`,{method:'PATCH',body:JSON.stringify(payload)})
export const deleteCrm=(resource:CrmResource,id:number)=>apiRequest(`/crm/${resource}/${id}`,{method:'DELETE'})

export type TransactionInput={projectId?:number;accountId?:number;categoryId?:number;companyId?:number;type:'income'|'expense'|'transfer';amount:number;currency?:string;transactionDate?:string;description?:string;reference?:string;status?:'pending'|'cleared'|'cancelled';metadata?:Record<string,unknown>}
export type InvoiceInput={projectId?:number;companyId?:number;contactId?:number;invoiceNumber?:string;status?:string;issueDate?:string;dueDate?:string;currency?:string;discountTotal?:number;notes?:string;items:Array<{description:string;quantity:number;unitPrice:number;taxRate?:number}>}
export type BudgetInput={projectId?:number;categoryId?:number;name:string;amount:number;currency?:string;periodStart?:string;periodEnd?:string;metadata?:Record<string,unknown>}
export const createTransaction=(payload:TransactionInput)=>apiRequest('/finance/transactions',{method:'POST',body:JSON.stringify(payload)})
export const createInvoice=(payload:InvoiceInput)=>apiRequest('/finance/invoices',{method:'POST',body:JSON.stringify(payload)})
export const updateInvoice=(id:number,payload:Partial<InvoiceInput>)=>apiRequest(`/finance/invoices/${id}`,{method:'PATCH',body:JSON.stringify(payload)})
export const createBudget=(payload:BudgetInput)=>apiRequest('/finance/budgets',{method:'POST',body:JSON.stringify(payload)})

async function upload(path:string,field:string,file:File,extra?:Record<string,string>){const form=new FormData();form.append(field,file);Object.entries(extra??{}).forEach(([key,value])=>form.append(key,value));return apiRequest(path,{method:'POST',body:form})}
export const uploadFile=(file:File,projectId?:number)=>upload('/files/upload','file',file,projectId?{projectId:String(projectId)}:undefined)
export const uploadAvatar=(file:File)=>upload('/users/me/avatar','avatar',file)
export const deleteFile=(id:number)=>apiRequest(`/files/${id}`,{method:'DELETE'})

export type ReportInput={projectId?:number;title:string;assistant:string;format:string;content?:string;metadata?:Record<string,unknown>}
export const generateReport=(payload:ReportInput)=>apiRequest('/reports/generate',{method:'POST',body:JSON.stringify(payload)})
export async function downloadReport(id:number){const token=localStorage.getItem('accessToken');const response=await fetch(`${API_URL}/reports/${id}/download`,{headers:token?{Authorization:`Bearer ${token}`}:{}});if(!response.ok)throw new Error(`Download failed (${response.status})`);const blob=await response.blob();const disposition=response.headers.get('Content-Disposition')??'';const filename=disposition.match(/filename="?([^";]+)"?/)?.[1]??`report-${id}`;const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();URL.revokeObjectURL(url)}

export type OrganizationInput={name?:string;logoUrl?:string;timezone?:string;currency?:string;language?:string;settings?:Record<string,unknown>}
export const updateOrganization=(payload:OrganizationInput)=>apiRequest('/organization',{method:'PATCH',body:JSON.stringify(payload)})
export const inviteMember=(payload:{email:string;roleId?:number;role?:string})=>apiRequest('/organization/invitations',{method:'POST',body:JSON.stringify(payload)})
export const changeMemberRole=(id:number,roleId:number)=>apiRequest(`/organization/members/${id}/role`,{method:'PATCH',body:JSON.stringify({roleId})})
export const removeMember=(id:number)=>apiRequest(`/organization/members/${id}`,{method:'DELETE'})
export const updateProfile=(payload:{firstName?:string;lastName?:string;phone?:string})=>apiRequest('/users/me',{method:'PATCH',body:JSON.stringify(payload)})
export const changePassword=(payload:{currentPassword:string;newPassword:string})=>apiRequest('/users/me/password',{method:'PATCH',body:JSON.stringify(payload)})
export const updatePreferences=(payload:{language?:string;timezone?:string;emailNotifications?:boolean;browserNotifications?:boolean})=>apiRequest('/users/me/preferences',{method:'PATCH',body:JSON.stringify(payload)})

export type IntegrationInput={provider:string;displayName:string;status:string;credentials?:Record<string,string>;settings?:Record<string,unknown>}
export const createIntegration=(payload:IntegrationInput)=>apiRequest('/admin/integrations',{method:'POST',body:JSON.stringify(payload)})
export const updateIntegration=(id:number,payload:Partial<IntegrationInput>)=>apiRequest(`/admin/integrations/${id}`,{method:'PATCH',body:JSON.stringify(payload)})
export const deleteIntegration=(id:number)=>apiRequest(`/admin/integrations/${id}`,{method:'DELETE'})
