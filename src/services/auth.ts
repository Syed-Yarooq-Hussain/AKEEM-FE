import { apiRequest, clearTokens, saveTokens } from './api'
export type SignupPayload={firstName:string;lastName:string;email:string;password:string;organizationName:string;timezone:string;currency:string}
export type LoginPayload=Pick<SignupPayload,'email'|'password'>
export type User={id:number;firstName:string;lastName:string;email:string;role:string;organizationId:number}
export type Organization={id:number;name:string;timezone:string;currency:string}
export type AuthResponse={accessToken:string;refreshToken:string;user:User;organization:Organization}
export const login=(payload:LoginPayload)=>apiRequest<AuthResponse>('/auth/login',{method:'POST',body:JSON.stringify(payload)})
export const signup=(payload:SignupPayload)=>apiRequest<AuthResponse>('/auth/signup',{method:'POST',body:JSON.stringify(payload)})
export const getMe=()=>apiRequest<User&{organization:Organization}>('/auth/me')
export const forgotPassword=(email:string)=>apiRequest('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})})
export const resetPassword=(token:string,password:string)=>apiRequest('/auth/reset-password',{method:'POST',body:JSON.stringify({token,password})})
export function saveAuth(response:AuthResponse){saveTokens(response.accessToken,response.refreshToken)}
export async function logout(){const refreshToken=localStorage.getItem('refreshToken');try{if(refreshToken)await apiRequest('/auth/logout',{method:'POST',body:JSON.stringify({refreshToken})},false)}finally{clearTokens()}}
