import { apiRequest } from './api'

export type DashboardOverview={
  metrics:{
    revenue:{value:number;currency:string;changePercent:number}
    activeDeals:{value:number;newThisWeek:number}
    pendingTasks:{value:number;highPriority:number}
    aiHoursSaved:{value:number;changePercent:number}
  }
  chart:Array<{period:string;revenue:number;expenses:number}>
  aiActivity:Array<{id:number;assistant:string;title:string;createdAt:string}>
}

export const getDashboardOverview=(projectId:number,period='6m')=>apiRequest<DashboardOverview>(`/dashboard/overview?projectId=${projectId}&period=${encodeURIComponent(period)}`)
