export interface IGlobalSlaResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface ISlaStatusData {
  last_updated: string
  sla_statuses: {
    label: string
    percentage: number
    value: number
  }[]
}

export interface ISlaCategoryStatusData {
  last_updated: string
  sla_categories: {
    label: string
    total_success: number
    total_failed: number
  }[]
}

export interface ISlaStateData {
  last_updated: string
  total_shipment: number
  sla_states: {
    label: string
    percentage: number
    total: number
  }[]
}

export interface ISlaStateList {
  label: string;
  percentage: number;
  total: number;
}

export interface IDexData {
  last_updated: string
  exceptions: {
    label: string
    percentage: number
    total: number
  }[]
}

export interface IRtoSummary {
  total_rto: number;
  total_acceptance: number;
  percentage_rto: number;
}