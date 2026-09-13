export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
type Envelope<T> = { success: boolean; data: T }
type ErrorEnvelope = { success?: false; message?: string; code?: string; errors?: unknown[] }
export class ApiError extends Error { constructor(message:string,public status:number,public code?:string,public errors:unknown[]=[]){super(message)} }
export function saveTokens(accessToken:string,refreshToken:string){localStorage.setItem('accessToken',accessToken);localStorage.setItem('refreshToken',refreshToken)}
export function clearTokens(){localStorage.removeItem('accessToken');localStorage.removeItem('refreshToken')}
let refreshPromise:Promise<boolean>|null=null
async function refreshAccessToken(){const refreshToken=localStorage.getItem('refreshToken');if(!refreshToken)return false;try{const response=await fetch(`${API_URL}/auth/refresh`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken})});if(!response.ok)return false;const envelope=await response.json() as Envelope<{accessToken:string;refreshToken:string}>;if(!envelope.success||!envelope.data?.accessToken||!envelope.data?.refreshToken)return false;saveTokens(envelope.data.accessToken,envelope.data.refreshToken);return true}catch{return false}}
export async function apiRequest<T>(path:string,options:RequestInit={},retry=true):Promise<T>{const token=localStorage.getItem('accessToken');const headers=new Headers(options.headers);if(options.body&&!(options.body instanceof FormData)&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');if(token)headers.set('Authorization',`Bearer ${token}`);const response=await fetch(`${API_URL}${path}`,{...options,headers});if(response.status===401&&retry&&!path.startsWith('/auth/')){refreshPromise??=refreshAccessToken().finally(()=>{refreshPromise=null});if(await refreshPromise)return apiRequest<T>(path,options,false);clearTokens();window.dispatchEvent(new Event('auth:expired'))}const body=await response.json().catch(()=>({})) as Envelope<T>&ErrorEnvelope;if(!response.ok||body.success===false)throw new ApiError(body.message??`Request failed (${response.status})`,response.status,body.code,body.errors);return body.data}

export async function downloadBlob(path:string,fallbackName:string,retry=true):Promise<void>{
 const token=localStorage.getItem('accessToken');
 const response=await fetch(API_URL+path,{headers:token?{Authorization:'Bearer '+token}:{}});
 if(response.status===401&&retry){
  refreshPromise??=refreshAccessToken().finally(()=>{refreshPromise=null});
  if(await refreshPromise)return downloadBlob(path,fallbackName,false);
  clearTokens();window.dispatchEvent(new Event('auth:expired'));
 }
 if(!response.ok){const error=await response.json().catch(()=>({})) as ErrorEnvelope;throw new ApiError(error.message??'Download failed ('+response.status+')',response.status,error.code,error.errors)}
 const disposition=response.headers.get('Content-Disposition')??'';
 const filename=disposition.match(/filename="?([^";]+)"?/)?.[1]??fallbackName;
 const url=URL.createObjectURL(await response.blob());const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
