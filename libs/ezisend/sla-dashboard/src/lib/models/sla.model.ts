import { ElementRef } from "@angular/core";

export interface IGlobalSlaResponse<T> {
  code: string;
  message: string;
  data: T;
}

// Base interface for common properties
export interface IBaseSlaItem {
  label: string;
  percentage: number;
  total: number;
}

// Base interface for items with success/failed counts
export interface IBaseSlaCategoryItem {
  label: string;
  total_success: number;
  total_failed: number;
}

// Base interface for items with value instead of total
export interface IBaseSlaStatusItem {
  label: string;
  percentage: number;
  value: number;
}

export interface ISlaStatusData {
  last_updated: string;
  sla_statuses: IBaseSlaStatusItem[];
}

export interface ISlaCategoryStatusData {
  last_updated: string;
  sla_categories: IBaseSlaCategoryItem[];
}

export interface ISlaStateData {
  last_updated: string;
  total_shipment: number;
  sla_states: IBaseSlaItem[];
}

// Remove redundant interface - use IBaseSlaItem instead
// export interface ISlaStateList {
//   label: string;
//   percentage: number;
//   total: number;
// }

export interface IDexData {
  last_updated: string;
  exceptions: IBaseSlaItem[];
}

export interface IRtoSummary {
  last_updated?: string; // Make optional since it's not always provided
  rto_data: {
    rto_count: number;
    acceptance_count: number;
    percentage: number;
  };
}

export interface IStatusSummary {
  last_updated: string;
  statuses: IBaseSlaItem[];
}

// New interfaces for component data structures
export interface IRtoCardData {
  theme: ThemeType;
  icon: string;
  label: string;
  status: string;
  price: string;
}

export interface IChartDataItem {
  label: string;
  total: number;
  percentage: number;
  color: string;
}

// Interface for chart datasets
export interface IChartDataset {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  stack?: string;
  _customLegend?: boolean;
  datalabels?: {
    display: boolean | ((ctx: any) => boolean);
    color?: string;
    font?: {
      weight?: string;
      size?: number;
    };
    align?: string;
    anchor?: string;
    textAlign?: string;
    padding?: { top: number; bottom: number };
    formatter?: (value: any, ctx: any) => string;
  };
}

// Interface for shipment data
export interface IShipmentData {
  state: string;
  percentage: number;
  shipments: number;
}

// Interface for category raw data
export interface ICategoryRawData {
  success: number[];
  failed: number[];
}

// Interface for chart options
export interface IChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  hover?: {
    mode: any;
  };
  legend?: {
    display: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
    reverse?: boolean;
    labels?: {
      padding?: number;
      filter?: (legendItem: any, chartData: any) => boolean;
    };
  };
  scales?: {
    yAxes?: any[];
    xAxes?: any[];
  };
  plugins?: {
    datalabels?: {
      display: boolean | ((ctx: any) => boolean);
      color?: string;
      font?: {
        weight?: string;
        size?: number;
      };
      formatter?: (value: number, ctx?: any) => string;
    };
  };
  animation?: {
    animateScale?: boolean;
    animateRotate?: boolean;
  };
  tooltips?: {
    callbacks?: {
      label?: (tooltipItem: any, data: any) => string;
    };
  };
}


export type DateRange = {
  startDate: string;
  endDate: string;
};

export type DownloadType = 'sla_status' | 'sla_category' | 'sla_state' | 'sla_dex' | 'sla_status_summary' | 'sla_all' | 'sla_shipment_status';

export type DashboardChartType = 'status' | 'category' | 'state' | 'dex' | 'status_summary';

export type ThemeType = 'green' | 'blue' | 'red' | 'yellow';

export type DateRangeEvent = {
  start_date: string;
  end_date: string;
};

export type ChartElement = ElementRef<HTMLElement>;

export type ChartContext = {
  dataset: {
    label: string;
    data: number[];
  };
  dataIndex: number;
  chart: {
    data: {
      datasets: Array<{
        label: string;
        data: number[];
      }>;
    };
  };
};

export type TooltipItem = {
  index: number;
  datasetIndex: number;
  yLabel: number;
  value: number;
};

export type ChartData = {
  datasets: Array<{
    label: string;
    data: number[];
  }>;
};

export type PdfTableData = {
  label: string;
  count: number;
  percentage: number;
};

export type CategoryTableData = {
  label: string;
  success: number;
  failed: number;
  total: number;
};

export type ChartConfig = {
  type: DashboardChartType;
  title: string;
  element: ElementRef;
};
