import {
  AfterViewInit,
  Component,
  Input,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BreadcrumbItem } from '@pos/ezisend/shared/data-access/models';
import * as moment from 'moment';
import { ChartOptions, ChartType, ChartDataSets } from 'chart.js';
import { Label } from 'ng2-charts';
import * as Chart from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { SlaService } from '../../services/sla.service';
import { CommonService } from '@pos/ezisend/shared/data-access/services';
import { finalize, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  IDexData,
  IGlobalSlaResponse,
  IRtoSummary,
  ISlaCategoryStatusData,
  ISlaStateData,
  ISlaStatusData,
  IStatusSummary,
  IRtoCardData,
  IChartDataItem,
  IShipmentData,
  ICategoryRawData,
  IBaseSlaCategoryItem,
  DateRange,
  DateRangeEvent,
  DownloadType,
  ChartConfig,
  DashboardChartType,
} from '../../models/sla.model';

// Register the datalabels plugin
Chart.plugins.register(ChartDataLabels);

// Chart.js v2 plugin for rounded bar edges (4px radius)
// Place this after Chart import and before component definition
if ((Chart as any) && (Chart as any).elements && (Chart as any).elements.Rectangle) {
  (Chart as any).elements.Rectangle.prototype.draw = function() {
    const ctx = this._chart.ctx;
    const vm = this._view;
    let left, right, top, bottom;
    const borderWidth = vm.borderWidth;
    const radius = 4;

    // Get dataset label
    const dataset = this._chart.data.datasets[this._datasetIndex];
    const isSuccessOrNoData = dataset.label &&
      (dataset.label.toLowerCase().includes('success') || dataset.label.toLowerCase().includes('no data'));

    if (!vm.horizontal) {
      left = vm.x - vm.width / 2;
      right = vm.x + vm.width / 2;
      top = vm.y;
      bottom = vm.base;
    } else {
      left = vm.base;
      right = vm.x;
      top = vm.y - vm.height / 2;
      bottom = vm.y + vm.height / 2;
    }

    ctx.save();
    ctx.beginPath();

    if (isSuccessOrNoData) {
      // Only top corners rounded
      ctx.moveTo(left, bottom);
      ctx.lineTo(left, top + radius);
      ctx.quadraticCurveTo(left, top, left + radius, top);
      ctx.lineTo(right - radius, top);
      ctx.quadraticCurveTo(right, top, right, top + radius);
      ctx.lineTo(right, bottom);
      ctx.lineTo(left, bottom); // Close the path at the bottom
    } else {
      // Square bar
      ctx.rect(left, top, right - left, bottom - top);
    }

    ctx.fillStyle = vm.backgroundColor;
    ctx.fill();

    // Draw border for both bar types
    if (borderWidth) {
      ctx.save();
      ctx.clip(); // Ensure border doesn't overflow
      ctx.strokeStyle = vm.borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };
}

@Component({
  selector: 'pos-sla-dashboard-page',
  templateUrl: './sla-dashboard-page.component.html',
  styleUrls: ['./sla-dashboard-page.component.scss'],
})
export class SlaDashboardPageComponent implements OnInit, AfterViewInit {
  @ViewChild('dashboardContainer', { static: false })
  dashboardContainer!: ElementRef;
  @ViewChild('statusChart', { static: false }) statusChart!: ElementRef;
  @ViewChild('categoryChart', { static: false }) categoryChart!: ElementRef;
  @ViewChild('stateChart', { static: false }) stateChart!: ElementRef;
  @ViewChild('dexChart', { static: false }) dexChart!: ElementRef;
  @ViewChild('dexChartOnly', { static: false }) dexChartOnly!: ElementRef;
  @ViewChild('statusSummaryChart', { static: false }) statusSummaryChart!: ElementRef;
  @ViewChild('statusSummaryChartOnly', { static: false }) statusSummaryChartOnly!: ElementRef;

  @Input() datePicker: DateRange = {
    startDate: '',
    endDate: '',
  };

  shipmentData: IShipmentData[] = [];
  start_date = '';
  end_date = '';
  isLoading = false;

  // Individual loading states for each graph
  isStatusLoading = false;
  isCategoryLoading = false;
  isStateLoading = false;
  isDexLoading = false;
  isRtoLoading = false;
  isStatusSummaryLoading = false;

  mainTitle = 'SLA Dashboard';
  loading = false;
  lastRefreshData = moment().format('DD MMM YYYY, hh:mm A');
  breadcrumbItems: BreadcrumbItem[] = [
    {
      title: 'SLA Dashboard',
      current: true,
    },
  ];

  action: {
    mainTitle: string;
    breadcrumbItems: BreadcrumbItem[];
  } = {
    mainTitle: 'SLA Dashboard',
    breadcrumbItems: [
      {
        title: 'SLA Dashboard',
        current: true,
      },
    ],
  };

  displayedColumns2: string[] = ['label', 'count', 'percentage'];

  dateRangePickerForm: FormGroup = this.fb.group({
    start_date: [''],
    end_date: [''],
  });

  // state bar chart data
  catData: IBaseSlaCategoryItem[] = [];

  catBarRawData: ICategoryRawData = {
    success: [],
    failed: [],
  };

  catBarOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    hover: {
      mode: false as any,
    },
    legend: {
      display: true,
      position: 'bottom',
      align: 'center',
      labels: {
        padding: 20,
      },
    },
    scales: {
      yAxes: [
        {
          stacked: true,
          display: true,
          gridLines: {
            display: false,
            drawBorder: false,
            drawOnChartArea: false,
            drawTicks: false,
          },
          ticks: {
            beginAtZero: true,
            max: 100,
            callback: function (value: number) {
              return value + '%';
            },
          },
        },
      ],
      xAxes: [
        {
          stacked: true,
          display: true, // Show x-axis
          gridLines: {
            display: false,
            drawBorder: false,
            drawOnChartArea: false,
            drawTicks: false,
          },
          ticks: {
            display: true, // Show x-axis labels
            autoSkip: false, // Show all labels
            maxRotation: 45, // Rotate labels if needed
            minRotation: 0,
            padding: 10, // Add space between labels and bars
          },
        },
      ],
    },
    plugins: {
      datalabels: {
        display: true,
        color: '#fff',
        font: {
          weight: 'bold',
          size: 14,
        },
        formatter: (value: number) => (value >= 10 ? this.truncateDecimal(value, 2) + '%' : ''),
      },
    },
    tooltips: {
      callbacks: {
        label: (tooltipItem: any, data: any) => {
          // Show both raw count and percentage in tooltip
          const idx = tooltipItem.index;
          const dsIdx = tooltipItem.datasetIndex;
          const comp =
            data.datasets[dsIdx].label === 'Success' ? 'success' : 'failed';
          const rawVal = this.catBarRawData[comp][idx];
          const percentage = tooltipItem.yLabel || tooltipItem.value;
          return `${data.datasets[dsIdx].label}: ${rawVal} (${this.truncateDecimal(percentage, 2)}%)`;
        },
      },
    },
  };

  catBarLabels: Label[] = [];
  catBarType: ChartType = 'bar';
  catBarLegend = true;
  catBarPlugins = [ChartDataLabels];

  catBarData: ChartDataSets[] = [];
  isEmptyType = true;

  //status pie chart
  statusPieLabels: string[] = [];
  statusPieData: ChartDataSets[] = [];
  isStatusEmpty = true;
  statusPiePlugins = [ChartDataLabels];
  statusPieOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    hover: {
      mode: false as any,
    },
    legend: {
      display: true,
      position: 'bottom',
      align: 'center',
      labels: {
        padding: 20,
      },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
    plugins: {
      datalabels: {
        display: true,
        color: '#fff',
        font: {
          weight: 'bold',
          size: 14,
        },
        formatter: (value: number, ctx: any) => {
          const dataArr = ctx.chart.data.datasets[0].data;
          const total = dataArr.reduce((a: number, b: number) => a + b, 0);
          if (!total) return '';
          const percentage = (value / total) * 100;
          return percentage > 0 ? this.truncateDecimal(percentage, 2) + '%' : '';
        },
      },
    },
  };

  // dex pie chart data
  dexSourceData: IChartDataItem[] = [];
  dexChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    hover: {
      mode: false as any,
    },
    plugins: {
      datalabels: {
        display: false, // Disable data labels
      },
    },
    legend: {
      display: false,
    },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  };

  dexChartLabels: string[] = [];
  dexChartData: number[] = [];
  isEmptyDex = true;
  dexChartType = 'pie';
  dexChartBackgroundColor: string[] = [
    '#36A2EB',
    '#FF6384',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
    '#C9CBCF',
    '#8B0000',
    '#00FF00',
    '#FFD700',
    '#808080',
    '#800080',
    '#00FFFF',
    '#FF00FF',
    '#000080',
  ];
  dexChartColors: Array<any> = [
    {
      backgroundColor: [...this.dexChartBackgroundColor],
    },
  ];

  // status summary pie chart data
  statusSummarySourceData: IChartDataItem[] = [];
  statusSummaryChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    hover: {
      mode: false as any,
    },
    plugins: {
      datalabels: {
        display: false, // Disable data labels
      },
    },
    legend: {
      display: false,
    },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  };

  statusSummaryChartLabels: string[] = [];
  statusSummaryChartData: number[] = [];
  isStatusSummaryEmpty = true;
  statusSummaryChartType = 'doughnut';

  // RTO data
  rtoData: IRtoCardData[] = [];
  isRtoEmpty = true;
  statusSummaryChartBackgroundColor: string[] = [
    '#36A2EB',
    '#FF6384',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
    '#C9CBCF',
    '#8B0000',
    '#00FF00',
    '#FFD700',
    '#808080',
    '#800080',
    '#00FFFF',
    '#FF00FF',
    '#000080',
  ];
  statusSummaryChartColors: Array<any> = [
    {
      backgroundColor: [...this.statusSummaryChartBackgroundColor],
    },
  ];

  stateChartLabels: string[] = [];
  stateChartData: number[] = [];
  stateChartData2: number[] = [];
  stateChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      animateScale: true,
      animateRotate: true,
    },
    legend: {
      display: false,
    },
    scales: {
      xAxes: [
        {
          ticks: {
            beginAtZero: true,
            callback: function (value) {
              return value + '%'; // Show % in x-axis labels
            },
          },
          scaleLabel: {
            display: false,
            labelString: 'Percentage',
          },
        },
      ],
      yAxes: [
        {
          ticks: {
            autoSkip: false,
          },
        },
      ],
    },
  };

  stateChartOptions2: ChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    legend: {
      display: false,
    },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
    scales: {
      xAxes: [
        {
          ticks: {
            display: true, // hides x-axis numbers
          },
          gridLines: {
            display: true, // optional
          },
        },
      ],
      yAxes: [
        {
          ticks: {
            display: false, // hides y-axis category labels (state names)
          },
          gridLines: {
            display: true, // optional
          },
        },
      ],
    },
  };

  compleate = 0;
  totalShipmentState = 0;
  last_updated: string[] = [];
  isEmptyRow = () => true;

  constructor(
    private fb: FormBuilder,
    private slaService: SlaService,
    private commonService: CommonService
  ) {}

  // Helper function to truncate decimal places without rounding
  public truncateDecimal(value: number, decimalPlaces: number): string {
    const factor = Math.pow(10, decimalPlaces);
    const truncated = Math.floor(value * factor) / factor;

    // If the value is a whole number, don't show decimal places
    if (truncated % 1 === 0) {
      return truncated.toString();
    }

    return truncated.toFixed(decimalPlaces);
  }

  ngOnInit(): void {
    this.start_date = moment()
      .subtract(30, 'days')
      .format('YYYY-MM-DDT00:00:00[Z]');
    this.end_date = moment().format('YYYY-MM-DDT00:00:00[Z]');

    // Initialize RTO data with default values
    this.rtoData = [
      {
        theme: 'green' as const,
        icon: 'done',
        label: 'Total No. of RTO',
        status: 'delivered',
        price: '0'
      },
      {
        theme: 'blue' as const,
        icon: 'done',
        label: 'Total No. of Acceptance',
        status: 'delivered',
        price: '0'
      },
      {
        theme: 'red' as const,
        icon: 'warning',
        label: 'Percentage of RTO',
        status: 'delivered',
        price: '0%'
      }
    ];
    this.isRtoEmpty = false;
  }

  ngAfterViewInit(): void {
    this.loadDashboardData();
  }

  onDateRangeChange(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.last_updated = [];

    // Load each graph data individually with separate loading states
    this.loadStatusData();
    this.loadCategoryData();
    this.loadStateData();
    this.loadDexData();
    this.loadRtoSummary();
    this.loadStatusSummary();
  }

  private loadStatusData() {
    this.isStatusLoading = true;
    this.getStatusData()
      .pipe(
        catchError((err) => {
          console.error('Error loading status data:', err);
          return of(null);
        }),
        finalize(() => {
          this.isStatusLoading = false;
        })
      )
      .subscribe((statusRes) => {
        if (statusRes) {
          this.mappingStatusResponse(statusRes);
        }
      });
  }

  private loadCategoryData() {
    this.isCategoryLoading = true;
    this.getCategoryData()
      .pipe(
        catchError((err) => {
          console.error('Error loading category data:', err);
          return of(null);
        }),
        finalize(() => {
          this.isCategoryLoading = false;
        })
      )
      .subscribe((catRes) => {
        if (catRes) {
          this.mappingCategoryResponse(catRes);
        }
      });
  }

  private loadStateData() {
    this.isStateLoading = true;
    this.getStateData()
      .pipe(
        catchError((err) => {
          console.error('Error loading state data:', err);
          return of(null);
        }),
        finalize(() => {
          this.isStateLoading = false;
        })
      )
      .subscribe((stateRes) => {
        if (stateRes) {
          this.mappingStateResponse(stateRes);
        }
      });
  }

  private loadDexData() {
    this.isDexLoading = true;
    this.getDexList()
      .pipe(
        catchError((err) => {
          console.error('Error loading dex data:', err);
          return of(null);
        }),
        finalize(() => {
          this.isDexLoading = false;
        })
      )
      .subscribe((dexRes) => {
        if (dexRes) {
          this.mappingDexResponse(dexRes);
        }
      });
  }

  private loadRtoSummary() {
    this.isRtoLoading = true;
    this.getRtoData()
      .pipe(
        catchError((err) => {
          console.error('Error loading RTO data:', err);
          return of(null);
        }),
        finalize(() => this.isRtoLoading = false)
      )
      .subscribe((rtoRes) => {
        if (rtoRes) {
          this.mappingRtoResponse(rtoRes);
        }
      });
  }

  private loadStatusSummary() {
    this.isStatusSummaryLoading = true;
    this.getStatusSummaryData()
      .pipe(
        catchError((err) => {
          console.error('Error loading status summary data:', err);
          return of(null);
        }),
        finalize(() => this.isStatusSummaryLoading = false)
      )
      .subscribe((statusSummaryRes) => {
        if (statusSummaryRes) {
          this.mappingStatusSummaryResponse(statusSummaryRes);
        }
      });
  }

  private mappingCategoryResponse(
    catRes: IGlobalSlaResponse<ISlaCategoryStatusData>
  ) {
    this.last_updated.push(catRes.data.last_updated);

    this.catBarOptions = {
      ...this.catBarOptions,
      legend: {
        display: true,
        position: 'bottom',
      },
      scales: {
        ...this.catBarOptions.scales,
        yAxes: [
          {
            ...(this.catBarOptions.scales && this.catBarOptions.scales.yAxes
              ? this.catBarOptions.scales.yAxes[0]
              : {}),
            ticks: {
              ...(this.catBarOptions.scales && this.catBarOptions.scales.yAxes
                ? this.catBarOptions.scales.yAxes[0]?.ticks
                : {}),
              max: 100,
              callback: function (value: number) {
                return value + '%';
              },
            },
          },
        ],
      },
    };

    const sla_category = catRes.data.sla_categories || [];
    this.catBarLabels = sla_category.map((item) => item.label);
    this.catBarRawData.success = sla_category.map((item) => item.total_success);
    this.catBarRawData.failed = sla_category.map((item) => item.total_failed);

    // Prepare arrays for each dataset
    const percentSuccess: number[] = [];
    const percentFailed: number[] = [];
    const percentNoData: number[] = [];
    sla_category.forEach((item) => {
      const total = item.total_success + item.total_failed;
      if (total === 0) {
        percentSuccess.push(0);
        percentFailed.push(0);
        percentNoData.push(100); // Full gray bar
      } else {
        percentSuccess.push((item.total_success / total) * 100);
        percentFailed.push((item.total_failed / total) * 100);
        percentNoData.push(0);
      }
    });

    const datasets = [
      {
        label: 'No Data',
        data: percentNoData,
        backgroundColor: '#cccccc',
        borderColor: '#cccccc',
        stack: 'a', // Revert: stack with Success/Failed
        datalabels: {
          display: (ctx: any) => ctx.dataset.label === 'No Data' && ctx.dataset.data[ctx.dataIndex] > 0,
          color: '#FFF',
          font: { weight: 'normal' as const, size: 12 }, // Smaller font size
          align: 'center' as const,
          anchor: 'center' as const,
          textAlign: 'center' as const,
          padding: { top: 0, bottom: 0 },
          formatter: (value: any, ctx: any) => value > 0 ? 'No\nData\nAvailable' : '',
        },
        _customLegend: false, // Custom property to help filter legend
      },
      {
        label: 'Failed',
        data: percentFailed,
        backgroundColor: '#eb4d5f',
        borderColor: '#eb4d5f',
        borderWidth: 2,
        stack: 'a',
        _customLegend: true,
        datalabels: { display: false }, // Never show label for failed
      },
      {
        label: 'Success',
        data: percentSuccess,
        backgroundColor: '#3478cb',
        borderColor: '#3478cb',
        stack: 'a',
        _customLegend: true,
        datalabels: {
          display: (ctx: any) => {
            // Only show if percentage > 10 and value > 0
            const value = ctx.dataset.data[ctx.dataIndex];
            return value > 10;
          },
          color: '#fff',
          font: { weight: 'bold' as const, size: 14 },
          align: 'center' as const,
          anchor: 'center' as const,
          formatter: (value: any, ctx: any) => value > 0 ? this.truncateDecimal(value, 2) + '%' : '',
        },
      },
    ];
    this.catBarData = datasets;
    this.catBarOptions = {
      ...this.catBarOptions,
      legend: {
        ...this.catBarOptions.legend,
        position: 'bottom',
        reverse: true,
        labels: {
          ...this.catBarOptions.legend?.labels,
          padding: 20,
          filter: function(legendItem: any, chartData: any) {
            // Only show legend for datasets with _customLegend: true
            if (!chartData.datasets) return false;
            const ds = chartData.datasets[legendItem.datasetIndex];
            return ds && ds._customLegend;
          }
        }
      },
      plugins: {
        ...this.catBarOptions.plugins,
        datalabels: undefined, // Use per-dataset config
      },
      tooltips: {
        callbacks: {
          label: (tooltipItem: any, data: any) => {
            const dsLabel = data.datasets[tooltipItem.datasetIndex].label;
            if (dsLabel === 'No Data') {
              return 'No data available';
            }
            if (dsLabel === 'Success') {
              const idx = tooltipItem.index;
              const rawVal = this.catBarRawData.success[idx];
              const failedVal = this.catBarRawData.failed[idx];
              const total = rawVal + failedVal;
              const percentage = total > 0 ? (rawVal / total) * 100 : 0;
              return percentage > 0 ? `Success: ${rawVal} (${this.truncateDecimal(percentage, 2)}%)` : '';
            }
            if (dsLabel === 'Failed') {
              const idx = tooltipItem.index;
              const rawVal = this.catBarRawData.failed[idx];
              const successVal = this.catBarRawData.success[idx];
              const total = rawVal + successVal;
              const percentage = total > 0 ? (rawVal / total) * 100 : 0;
              return percentage > 0 ? `Failed: ${rawVal} (${this.truncateDecimal(percentage, 2)}%)` : '';
            }
            return '';
          },
        },
      },
    };
    this.isEmptyType =
      sla_category.length === 0 ||
      sla_category.every(
        (item) => item.total_success === 0 && item.total_failed === 0
      );
  }

  private mappingStatusResponse(statusRes: IGlobalSlaResponse<ISlaStatusData>) {
    this.last_updated.push(statusRes.data.last_updated);
    this.last_updated.push(statusRes.data.last_updated);
    const sla_status = statusRes.data.sla_statuses || [];
    this.statusPieLabels = sla_status.map(
      (item) => item.label + ' (' + item.value + ')'
    );
    this.statusPieData = [
      {
        data: sla_status.map((item) => Number(this.truncateDecimal(item.percentage, 2))),
        backgroundColor: ['#50a0f8', '#f7cb4f'],
        borderColor: ['#50a0f8', '#f7cb4f'],
        borderWidth: 2,
      },
    ];
    this.isStatusEmpty =
      sla_status.length === 0 || sla_status.every((item) => item.value === 0);
  }

  private mappingStateResponse(stateRes: IGlobalSlaResponse<ISlaStateData>) {
    const sortedData = stateRes.data.sla_states
      .filter((item) => item.total > 0)
      .sort((a, b) => b.percentage - a.percentage);
    this.shipmentData = sortedData.map((item) => ({
      state: item.label,
      percentage: Number(this.truncateDecimal(item.percentage, 2)),
      shipments: item.total,
    }));
    this.totalShipmentState = stateRes.data.total_shipment;
  }

  private mappingDexResponse(dexRes: IGlobalSlaResponse<IDexData>) {
    this.last_updated.push(dexRes.data.last_updated);
    const dex = dexRes.data.exceptions || [];

    // Sort by total count descending
    const sortedDex = dex.sort((a, b) => b.total - a.total);

    // Create labels with count information
    this.dexChartLabels = sortedDex.map((item) => `${item.label} (${item.total})`);

    this.dexChartData = sortedDex.map((item) => Number(this.truncateDecimal(item.percentage, 2)));
    this.dexSourceData = sortedDex.map((item, index) => ({
      label: item.label,
      total: item.total,
      percentage: Number(this.truncateDecimal(item.percentage, 2)),
      color: this.dexChartBackgroundColor[index],
    }));
    this.isEmptyDex = dex.length === 0 || dex.every((item) => item.total === 0);
  }

  private mappingStatusSummaryResponse(statusSummaryRes: IGlobalSlaResponse<IStatusSummary>) {
    this.last_updated.push(statusSummaryRes.data.last_updated);
    const statuses = statusSummaryRes.data.statuses || [];

    // Sort by total count descending
    const sortedStatuses = statuses.sort((a, b) => b.total - a.total);

    // Create labels with count information
    this.statusSummaryChartLabels = sortedStatuses.map((item) => `${item.label} (${item.total})`);

    this.statusSummaryChartData = sortedStatuses.map((item) => Number(this.truncateDecimal(item.percentage, 2)));
    this.statusSummarySourceData = sortedStatuses.map((item, index) => ({
      label: item.label,
      total: item.total,
      percentage: Number(this.truncateDecimal(item.percentage, 2)),
      color: this.statusSummaryChartBackgroundColor[index],
    }));
    this.isStatusSummaryEmpty = statuses.length === 0 || statuses.every((item) => item.total === 0);
  }

        private mappingRtoResponse(rtoRes: IGlobalSlaResponse<IRtoSummary>) {
    // Note: IRtoSummary doesn't have last_updated, so we'll use current timestamp
    this.last_updated.push(new Date().toISOString());

    this.rtoData = [
      {
        theme: 'green' as const,
        icon: 'done',
        label: 'Total No. of RTO',
        status: 'delivered',
        price: rtoRes.data.total_rto.toString()
      },
      {
        theme: 'blue' as const,
        icon: 'done',
        label: 'Total No. of Acceptance',
        status: 'delivered',
        price: rtoRes.data.total_acceptance.toString()
      },
      {
        theme: 'red' as const,
        icon: 'warning',
        label: 'Percentage of RTO',
        status: 'delivered',
        price: this.truncateDecimal(rtoRes.data.percentage_rto, 2) + '%'
      }
    ];

    // Always show the cards, never set as empty
    this.isRtoEmpty = false;
  }

  private getCategoryData() {
    return this.slaService.getCategoryStatusList(this.startDate, this.endDate);
  }
  private getStatusData() {
    return this.slaService.getStatusList(this.startDate, this.endDate);
  }
  private getStateData() {
    return this.slaService.getStateList(this.startDate, this.endDate);
  }
  private getDexList() {
    return this.slaService.getDexList(this.startDate, this.endDate);
  }

  private getRtoData() {
    return this.slaService.getRtoSummary(this.startDate, this.endDate);
  }

  private getStatusSummaryData() {
    return this.slaService.getStatusSummary(this.startDate, this.endDate);
  }

  onDateRangePickerFormChange(event: DateRangeEvent): void {
    console.log(event);
    if (!event.start_date || !event.end_date) return;

    this.dateRangePickerForm.patchValue({
      start_date: event.start_date,
      end_date: event.end_date,
    });
    this.ngAfterViewInit();
  }

  get updatedLastRefreshed() {
    this.last_updated = this.last_updated.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    const formattingDate = moment(this.last_updated[0]).format(
      'DD MMM YYYY, hh:mm A'
    );

    return formattingDate;
  }

  get startDate() {
    const start_date = this.dateRangePickerForm.value.start_date;
    return moment(start_date).format('YYYY-MM-DD');
  }

  get endDate() {
    const end_date = this.dateRangePickerForm.value.end_date;
    return moment(end_date).format('YYYY-MM-DD');
  }

  getTotalShipments(): number {
    return this.shipmentData.reduce((total, item) => total + item.shipments, 0);
  }

  getShipmentBarWidth(value: number): number {
    if (this.shipmentData.length === 0) return 0;
    const max = Math.max(...this.shipmentData.map((d) => d.shipments));
    if (max === 0) return 0;
    return (value / max) * 100;
  }

  getFilteredDexData(): IChartDataItem[] {
    return this.dexSourceData.filter(element => element.total > 0);
  }

  getFilteredStatusSummaryData(): IChartDataItem[] {
    return this.statusSummarySourceData.filter(element => element.total > 0);
  }

  async downloadAllFile(): Promise<void> {
    this.commonService.isLoading(true);

    this.slaService
      .getDownloadFile('sla_all', this.startDate, this.endDate)
      .pipe(finalize(() => this.commonService.isLoading(false)))
      .subscribe({
        next: (res: any) => {
          this.downloadWithFileName('sla_all', res);
        },
        error: (err: any) => {
          console.error('Error downloading all files:', err);
        },
      });
  }

  downloadFile(type: DownloadType): void {
    this.commonService.isLoading(true);
    this.slaService
      .getDownloadFile(type, this.startDate, this.endDate)
      .pipe(finalize(() => this.commonService.isLoading(false)))
      .subscribe({
        next: (res) => {
          this.downloadWithFileName(type, res);
        },
        error: (err) => {
          console.log(err);
        },
      });
  }

  private downloadWithFileName(
    type: DownloadType,
    resp: Blob
  ): void {
    const fileName = `${type.toUpperCase()}_${moment().format(
      'YYYY-MM-DD_HH-mm'
    )}.xlsx`;
    const blob = new Blob([resp], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async downloadAllAsPDF(): Promise<void> {
    if (!this.dashboardContainer) {
      return;
    }

    this.commonService.isLoading(true);

    try {
      // Wait for charts to be fully rendered
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if all chart elements are available
      if (
        !this.statusChart ||
        !this.categoryChart ||
        !this.stateChart ||
        !this.dexChartOnly
      ) {
        // Wait a bit more and try again
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add title and metadata
      pdf.setFontSize(20);
      pdf.text('SLA Dashboard Report', 105, 20, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(
        `Generated on: ${moment().format('DD MMM YYYY, hh:mm A')}`,
        105,
        30,
        { align: 'center' }
      );
      pdf.text(
        `Date Range: ${moment(this.startDate).format('DD MMM YYYY')} - ${moment(
          this.endDate
        ).format('DD MMM YYYY')}`,
        105,
        40,
        { align: 'center' }
      );

      let currentY = 50;
      let chartsProcessed = 0;

      // Download each chart and add to the same PDF
      const charts: ChartConfig[] = [
        { type: 'status', title: 'SLA Status', element: this.statusChart },
        {
          type: 'category',
          title: 'SLA Type (D+1 to D+5)',
          element: this.categoryChart,
        },
        {
          type: 'state',
          title: 'SLA by Destination',
          element: this.stateChart,
        },
        { type: 'dex', title: 'Delivery Exceptions', element: this.dexChartOnly },
      ];

      for (const chart of charts) {
        if (!chart.element) {
          console.error(`${chart.type} chart element not found`);
          continue;
        }

        const element = chart.element.nativeElement;
        // Configure html2canvas options for chart only
        const canvas = await html2canvas(element, {
          allowTaint: true,
          useCORS: true,
          scale: 2, // Higher quality
          backgroundColor: '#ffffff',
          width: element.scrollWidth,
          height: element.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 180; // Leave some margin
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Check if we need a new page
        if (currentY + imgHeight + 50 > 270) {
          // 50 for title and table
          pdf.addPage();
          currentY = 20;
        }

        // Add chart title
        pdf.setFontSize(14);
        pdf.text(chart.title, 20, currentY);
        currentY += 10;

        // Calculate position to center the image
        const xPosition = (210 - imgWidth) / 2; // Center horizontally

        // Add the chart image
        pdf.addImage(imgData, 'PNG', xPosition, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 10;

        // Add detailed table
        currentY = this.addDetailTableToPDF(pdf, chart.type, currentY);

        // Add some space between charts
        currentY += 20;

        chartsProcessed++;
      }

      console.log(
        `Total charts processed: ${chartsProcessed} out of ${charts.length}`
      );

      // Save the PDF
      const fileName = `SLA_Dashboard_Complete_${moment().format(
        'YYYY-MM-DD_HH-mm'
      )}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating complete PDF:', error);
    } finally {
      this.commonService.isLoading(false);
    }
  }

  async downloadChartAsPDF(chartType: DashboardChartType): Promise<void> {
    console.log(`Starting download for ${chartType} chart...`);

    let chartElement: ElementRef | undefined;
    let title = '';
    let fileName = '';

    // Get the appropriate chart element and set title
    switch (chartType) {
      case 'status':
        chartElement = this.statusChart;
        title = 'SLA Status';
        fileName = `SLA_Status_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
        break;
      case 'category':
        chartElement = this.categoryChart;
        title = 'SLA Type (D+1 to D+5)';
        fileName = `SLA_Category_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
        break;
      case 'state':
        chartElement = this.stateChart;
        title = 'SLA by Destination';
        fileName = `SLA_State_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
        break;
      case 'dex':
        chartElement = this.dexChartOnly;
        title = 'Delivery Exceptions';
        fileName = `SLA_DEX_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
        break;
      case 'status_summary':
        chartElement = this.statusSummaryChartOnly;
        title = 'Delivery Status';
        fileName = `SLA_Status_Summary_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
        break;
    }

    if (!chartElement) {
      console.error(`${chartType} chart element not found`);
      return;
    }

    console.log(
      `Chart element found for ${chartType}, proceeding with download...`
    );

    // Only show loading if this is a single chart download
    const isSingleDownload = !this.commonService.isLoading;
    if (isSingleDownload) {
      this.commonService.isLoading(true);
    }

    try {
      // Wait for chart to be fully rendered
      await new Promise((resolve) => setTimeout(resolve, 500));

      const element = chartElement.nativeElement;

      // Configure html2canvas options for chart only
      const canvas = await html2canvas(element, {
        allowTaint: true,
        useCORS: true,
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Different sizing for DEX chart to allow side-by-side layout
      let imgWidth, imgHeight, xPosition, yPosition, tableYPosition;

            if (chartType === 'dex') {
        // Smaller chart for DEX in flex column layout
        imgWidth = 120; // Smaller width but not too small
        imgHeight = (canvas.height * imgWidth) / canvas.width;
        xPosition = (210 - imgWidth) / 2; // Center horizontally
        yPosition = 40; // Start below title

        // Add title and metadata
        pdf.setFontSize(18);
        pdf.text(title, 105, 20, { align: 'center' });
        pdf.setFontSize(10);
        pdf.text(
          `Generated on: ${moment().format('DD MMM YYYY, hh:mm A')}`,
          105,
          30,
          { align: 'center' }
        );
        pdf.text(
          `Date Range: ${moment(this.startDate).format('DD MMM YYYY')} - ${moment(
            this.endDate
          ).format('DD MMM YYYY')}`,
          105,
          35,
          { align: 'center' }
        );

        // Add the chart image centered
        pdf.addImage(imgData, 'PNG', xPosition, yPosition, imgWidth, imgHeight);

        // Add table below the chart
        const tableYPosition = yPosition + imgHeight + 20;
        this.addDexTableWithHeaders(pdf, tableYPosition);
      } else {
        // Original sizing for other charts
        imgWidth = 180; // Leave some margin
        imgHeight = (canvas.height * imgWidth) / canvas.width;
        xPosition = (210 - imgWidth) / 2; // Center horizontally
        yPosition = 40; // Start below title

        // Add title and metadata
        pdf.setFontSize(18);
        pdf.text(title, 105, 20, { align: 'center' });
        pdf.setFontSize(10);
        pdf.text(
          `Generated on: ${moment().format('DD MMM YYYY, hh:mm A')}`,
          105,
          30,
          { align: 'center' }
        );
        pdf.text(
          `Date Range: ${moment(this.startDate).format('DD MMM YYYY')} - ${moment(
            this.endDate
          ).format('DD MMM YYYY')}`,
          105,
          35,
          { align: 'center' }
        );

        // Add the chart image
        pdf.addImage(imgData, 'PNG', xPosition, yPosition, imgWidth, imgHeight);

        // Add detailed table based on chart type
        tableYPosition = yPosition + imgHeight + 20;
        this.addDetailTable(pdf, chartType, tableYPosition);
      }

      // Save the PDF
      pdf.save(fileName);
      console.log(`Successfully downloaded ${fileName}`);
    } catch (error) {
      console.error(`Error generating PDF for ${chartType}:`, error);
    } finally {
      if (isSingleDownload) {
        this.commonService.isLoading(false);
      }
    }
  }

  private addDetailTable(pdf: jsPDF, chartType: DashboardChartType, startY: number): void {
    pdf.setFontSize(12);
    pdf.text('Detailed Data', 20, startY);

    const currentY = startY + 10;

    switch (chartType) {
      case 'status':
        this.addStatusTable(pdf, currentY);
        break;
      case 'category':
        this.addCategoryTable(pdf, currentY);
        break;
      case 'state':
        this.addStateTable(pdf, currentY);
        break;
      case 'dex':
        this.addDexTable(pdf, currentY);
        break;
    }
  }

  private addDetailTableToPDF(
    pdf: jsPDF,
    chartType: DashboardChartType,
    startY: number
  ): number {
    pdf.setFontSize(12);
    pdf.text('Detailed Data', 20, startY);

    let currentY = startY + 10;

    switch (chartType) {
      case 'status':
        currentY = this.addStatusTableToPDF(pdf, currentY);
        break;
      case 'category':
        currentY = this.addCategoryTableToPDF(pdf, currentY);
        break;
      case 'state':
        currentY = this.addStateTableToPDF(pdf, currentY);
        break;
      case 'dex':
        currentY = this.addDexTableToPDF(pdf, currentY);
        break;
    }

    return currentY;
  }

  private addStatusTable(pdf: jsPDF, startY: number): void {
    // Get status data from the chart
    const statusData = this.statusPieLabels.map((label, index) => {
      const data = this.statusPieData[0]?.data?.[index];
      const numericData = typeof data === 'number' ? data : 0;
      return {
        label: label.replace(/\([^)]*\)/g, '').trim(), // Remove count from label
        percentage: numericData,
        count: parseInt(label.match(/\((\d+)\)/)?.[1] || '0'),
      };
    });

    // Table headers
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, startY, 170, 8);
    pdf.text('Status', 25, startY + 6);
    pdf.text('Count', 100, startY + 6);
    pdf.text('Percentage', 140, startY + 6);

    // Table data
    let currentY = startY + 8;
    statusData.forEach((item, index) => {
      if (currentY > 270) {
        // Check if we need a new page
        pdf.addPage();
        currentY = 20;
      }

      const fillColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(fillColor, fillColor, fillColor);
      pdf.rect(20, currentY, 170, 8);
      pdf.text(item.label, 25, currentY + 6);
      pdf.text(item.count.toString(), 100, currentY + 6);
      pdf.text(`${this.truncateDecimal(item.percentage, 2)}%`, 140, currentY + 6);

      currentY += 8;
    });
  }

  private addCategoryTable(pdf: jsPDF, startY: number): void {
    // Get category data from the chart
    const categoryData = this.catBarLabels.map((label, index) => {
      const successData = this.catBarData[0]?.data?.[index];
      const failedData = this.catBarData[1]?.data?.[index];
      const success = typeof successData === 'number' ? successData : 0;
      const failed = typeof failedData === 'number' ? failedData : 0;
      return {
        label: label,
        success: success,
        failed: failed,
        total: success + failed,
      };
    });

    // Table headers
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, startY, 170, 8);
    pdf.text('SLA Type', 25, startY + 6);
    pdf.text('Success', 80, startY + 6);
    pdf.text('Failed', 120, startY + 6);
    pdf.text('Total', 160, startY + 6);

    // Table data
    let currentY = startY + 8;
    categoryData.forEach((item, index) => {
      if (currentY > 270) {
        pdf.addPage();
        currentY = 20;
      }

      const fillColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(fillColor, fillColor, fillColor);
      pdf.rect(20, currentY, 170, 8);
      pdf.text(item.label, 25, currentY + 6);
      pdf.text(item.success.toString(), 80, currentY + 6);
      pdf.text(item.failed.toString(), 120, currentY + 6);
      pdf.text(item.total.toString(), 160, currentY + 6);

      currentY += 8;
    });
  }

  private addStateTable(pdf: jsPDF, startY: number): void {
    // Table headers
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, startY, 170, 8);
    pdf.text('Destination', 25, startY + 6);
    pdf.text('Shipments', 100, startY + 6);
    pdf.text('SLA %', 140, startY + 6);

    // Table data
    let currentY = startY + 8;
    this.shipmentData.forEach((item, index) => {
      if (currentY > 270) {
        pdf.addPage();
        currentY = 20;
      }

      const fillColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(fillColor, fillColor, fillColor);
      pdf.rect(20, currentY, 170, 8);
      pdf.text(item.state, 25, currentY + 6);
      pdf.text(item.shipments.toString(), 100, currentY + 6);
      pdf.text(`${this.truncateDecimal(item.percentage, 2)}%`, 140, currentY + 6);

      currentY += 8;
    });

    // Add total row
    if (currentY > 270) {
      pdf.addPage();
      currentY = 20;
    }

    const totalY = currentY;
    pdf.setFillColor(220, 220, 220);
    pdf.rect(20, totalY, 170, 8);
    pdf.setFontSize(10);
    pdf.text('Total', 25, totalY + 6);
    pdf.text(this.getTotalShipments().toString(), 100, totalY + 6);
    pdf.text('', 140, totalY + 6);
  }

  private addDexTable(pdf: jsPDF, startY: number): void {
    // Table headers
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, startY, 170, 8);
    pdf.text('Exception Type', 25, startY + 6);
    pdf.text('Count', 120, startY + 6);
    pdf.text('Percentage', 150, startY + 6);

    // Table data
    let currentY = startY + 8;
    this.dexSourceData.forEach((item, index) => {
      if (currentY > 270) {
        pdf.addPage();
        currentY = 20;
      }

      const fillColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(fillColor, fillColor, fillColor);
      pdf.rect(20, currentY, 170, 8);
      pdf.text(item.label || '', 25, currentY + 6);
      pdf.text((item.total || 0).toString(), 120, currentY + 6);
      pdf.text(`${this.truncateDecimal(item.percentage || 0, 2)}%`, 150, currentY + 6);

      currentY += 8;
    });
  }

  private addStatusTableToPDF(pdf: jsPDF, startY: number): number {
    // Get status data from the chart
    const statusData = this.statusPieLabels.map((label, index) => {
      const data = this.statusPieData[0]?.data?.[index];
      const numericData = typeof data === 'number' ? data : 0;
      return {
        label: label.replace(/\([^)]*\)/g, '').trim(), // Remove count from label
        percentage: numericData,
        count: parseInt(label.match(/\((\d+)\)/)?.[1] || '0'),
      };
    });

    // Table headers
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, startY, 170, 8);
    pdf.text('Status', 25, startY + 6);
    pdf.text('Count', 100, startY + 6);
    pdf.text('Percentage', 140, startY + 6);

    // Table data
    let currentY = startY + 8;
    statusData.forEach((item, index) => {
      if (currentY > 270) {
        // Check if we need a new page
        pdf.addPage();
        currentY = 20;
      }

      const fillColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(fillColor, fillColor, fillColor);
      pdf.rect(20, currentY, 170, 8);
      pdf.text(item.label, 25, currentY + 6);
      pdf.text(item.count.toString(), 100, currentY + 6);
      pdf.text(`${this.truncateDecimal(item.percentage, 2)}%`, 140, currentY + 6);

      currentY += 8;
    });

    return currentY;
  }

  private addCategoryTableToPDF(pdf: jsPDF, startY: number): number {
    // Get category data from the chart
    const categoryData = this.catBarLabels.map((label, index) => {
      const successData = this.catBarData[0]?.data?.[index];
      const failedData = this.catBarData[1]?.data?.[index];
      const success = typeof successData === 'number' ? successData : 0;
      const failed = typeof failedData === 'number' ? failedData : 0;
      return {
        label: label,
        success: success,
        failed: failed,
        total: success + failed,
      };
    });

    // Table headers
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, startY, 170, 8);
    pdf.text('SLA Type', 25, startY + 6);
    pdf.text('Success', 80, startY + 6);
    pdf.text('Failed', 120, startY + 6);
    pdf.text('Total', 160, startY + 6);

    // Table data
    let currentY = startY + 8;
    categoryData.forEach((item, index) => {
      if (currentY > 270) {
        pdf.addPage();
        currentY = 20;
      }

      const fillColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(fillColor, fillColor, fillColor);
      pdf.rect(20, currentY, 170, 8);
      pdf.text(item.label, 25, currentY + 6);
      pdf.text(item.success.toString(), 80, currentY + 6);
      pdf.text(item.failed.toString(), 120, currentY + 6);
      pdf.text(item.total.toString(), 160, currentY + 6);

      currentY += 8;
    });

    return currentY;
  }

  private addStateTableToPDF(pdf: jsPDF, startY: number): number {
    // Table headers
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, startY, 170, 8);
    pdf.text('Destination', 25, startY + 6);
    pdf.text('Shipments', 100, startY + 6);
    pdf.text('SLA %', 140, startY + 6);

    // Table data
    let currentY = startY + 8;
    this.shipmentData.forEach((item, index) => {
      if (currentY > 270) {
        pdf.addPage();
        currentY = 20;
      }

      const fillColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(fillColor, fillColor, fillColor);
      pdf.rect(20, currentY, 170, 8);
      pdf.text(item.state, 25, currentY + 6);
      pdf.text(item.shipments.toString(), 100, currentY + 6);
      pdf.text(`${this.truncateDecimal(item.percentage, 2)}%`, 140, currentY + 6);

      currentY += 8;
    });

    // Add total row
    if (currentY > 270) {
      pdf.addPage();
      currentY = 20;
    }

    const totalY = currentY;
    pdf.setFillColor(220, 220, 220);
    pdf.rect(20, totalY, 170, 8);
    pdf.setFontSize(10);
    pdf.text('Total', 25, totalY + 6);
    pdf.text(this.getTotalShipments().toString(), 100, totalY + 6);
    pdf.text('', 140, totalY + 6);

    return totalY + 8;
  }

  private addDexTableToPDF(pdf: jsPDF, startY: number): number {
    // Table headers
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, startY, 170, 8);
    pdf.text('Exception Type', 25, startY + 6);
    pdf.text('Count', 120, startY + 6);
    pdf.text('Percentage', 150, startY + 6);

    // Table data
    let currentY = startY + 8;
    this.dexSourceData.forEach((item, index) => {
      if (currentY > 270) {
        pdf.addPage();
        currentY = 20;
      }

      const fillColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(fillColor, fillColor, fillColor);
      pdf.rect(20, currentY, 170, 8);
      pdf.text(item.label || '', 25, currentY + 6);
      pdf.text((item.total || 0).toString(), 120, currentY + 6);
      pdf.text(`${this.truncateDecimal(item.percentage || 0, 2)}%`, 150, currentY + 6);

      currentY += 8;
    });

    return currentY;
  }

  private addDexTableSideBySide(pdf: jsPDF, startX: number, startY: number): void {
    // Table headers
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(startX, startY, 80, 8);
    pdf.text('Exception Type', startX + 5, startY + 6);
    pdf.text('Count', startX + 50, startY + 6);

    // Table data
    let currentY = startY + 8;
    this.dexSourceData.forEach((item, index) => {
      if (currentY > 270) {
        pdf.addPage();
        currentY = 20;
      }

      const fillColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(fillColor, fillColor, fillColor);
      pdf.rect(startX, currentY, 80, 8);
      pdf.text(item.label || '', startX + 5, currentY + 6);
      pdf.text((item.total || 0).toString(), startX + 50, currentY + 6);

      currentY += 8;
    });
  }

  private addDexTableWithHeaders(pdf: jsPDF, startY: number): void {
    // Table headers
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, startY, 170, 8);
    pdf.text('#', 25, startY + 6);
    pdf.text('Label', 40, startY + 6);
    pdf.text('Count', 100, startY + 6);
    pdf.text('Percentage', 140, startY + 6);

    // Table data
    let currentY = startY + 8;
    this.dexSourceData.forEach((item, index) => {
      if (currentY > 270) {
        pdf.addPage();
        currentY = 20;
      }

      const fillColor = index % 2 === 0 ? 248 : 255;
      pdf.setFillColor(fillColor, fillColor, fillColor);
      pdf.rect(20, currentY, 170, 8);
      pdf.text((index + 1).toString(), 25, currentY + 6); // Row number
      pdf.text(item.label || '', 40, currentY + 6);
      pdf.text((item.total || 0).toString(), 100, currentY + 6);
      pdf.text(`${this.truncateDecimal(item.percentage || 0, 2)}%`, 140, currentY + 6);

      currentY += 8;
    });
  }
}
