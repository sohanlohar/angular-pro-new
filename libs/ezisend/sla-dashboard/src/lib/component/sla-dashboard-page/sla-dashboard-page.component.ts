import {
  AfterViewInit,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BreadcrumbItem } from '@pos/ezisend/shared/data-access/models';
import * as moment from 'moment';
import { ChartOptions, ChartType, ChartDataSets } from 'chart.js';
import { Label } from 'ng2-charts';
import { SlaService } from '../../services/sla.service';
import { CommonService } from '@pos/ezisend/shared/data-access/services';
import { finalize } from 'rxjs';

@Component({
  selector: 'pos-sla-dashboard-page',
  templateUrl: './sla-dashboard-page.component.html',
  styleUrls: ['./sla-dashboard-page.component.scss'],
})
export class SlaDashboardPageComponent
  implements OnInit, AfterViewInit
{
  @Input() datePicker: { startDate: string; endDate: string } = {
    startDate: '',
    endDate: '',
  };
  updatedLastRefreshed = '';

  shipmentData: any[] = [];
  start_date = '';
  end_date = '';
  isLoading = false;

  mainTitle = 'SLA Dashboard';
  loading = false;
  lastRefreshData = moment().format('DD MMM YYYY, hh:mm A');
  breadcrumbItems: BreadcrumbItem[] = [
    {
      title: 'SLA Dashboard',
      current: true,
    },
  ];

  action = {
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
  catData: {
    label: string;
    total_success: number;
    total_failed: number;
  }[] = [];

  catBarOptions: ChartOptions = {
    responsive: true,
    scales: {
      yAxes: [
        {
          display: false, // <--- Fully hides Y axis including ticks & line
          gridLines: {
            display: false,
            drawBorder: false,
            drawOnChartArea: false,
            drawTicks: false,
          },
          ticks: {
            beginAtZero: true,
          },
        },
      ],
      xAxes: [
        {
          display: false, // <--- Fully hides X axis including ticks & line
          gridLines: {
            display: false,
            drawBorder: false,
            drawOnChartArea: false,
            drawTicks: false,
          },
        },
      ],
    },
  };

  catBarLabels: Label[] = [];
  catBarType: ChartType = 'bar';
  catBarLegend = true;

  catBarData: ChartDataSets[] = [];

  //status pie chart
  statusPieLabels: string[] = [];
  statusPieData: ChartDataSets[] = [];
  statusPieOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    legend: {
      display: true,
    },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  };

  // dex pie chart data
  dexSourceData: any[] = [];
  dexChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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

  stateChartLabels: string[] = [];
  stateChartData: any[] = [];
  stateChartData2: any[] = [];
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

  constructor(
    private fb: FormBuilder,
    private slaService: SlaService,
    private commonService: CommonService
  ) {}

  ngOnInit(): void {
    this.start_date = moment()
      .subtract(30, 'days')
      .format('YYYY-MM-DDT00:00:00[Z]');
    this.end_date = moment().format('YYYY-MM-DDT00:00:00[Z]');
  }

  ngAfterViewInit() {
    this.last_updated = [];
    this.isLoading = true;
    this.compleate = 0;
    this.getCategoryData();
    this.getStatusData();
    this.getStateData();
    this.getDexList();
  }

  private getStatusData() {
    this.slaService
      .getStatusList(this.startDate, this.endDate)
      .pipe(finalize(() => this.checLoading(1)))
      .subscribe((res) => {
        this.last_updated.push(res.data.last_updated);
        this.last_updated.push(res.data.last_updated);
        const sla_status = res.data.sla_status || [];
        this.statusPieLabels = sla_status.map(
          (item) => item.label + ' (' + item.value + ')'
        );
        this.statusPieData = [
          {
            data: sla_status.map((item) => Number(item.percentage.toFixed(2))),
            backgroundColor: ['#6be0bf', '#EA7369'],
            borderColor: ['#6be0bf', '#EA7369'],
            borderWidth: 2,
          },
        ];
      });
  }

  private getCategoryData() {
    this.slaService
      .getCategoryStatusList(this.startDate, this.endDate)
      .pipe(finalize(() => this.checLoading(1)))
      .subscribe((res) => {
        this.last_updated.push(res.data.last_updated);
        const copyResponse = { ...res };
        const maxValueSuccess = Math.max(
          ...copyResponse.data.sla_category.map((item) => item.total_success)
        );
        const maxValueFailed = Math.max(
          ...copyResponse.data.sla_category.map((item) => item.total_failed)
        );
        const maxValue = Math.max(maxValueSuccess, maxValueFailed);

        this.catBarOptions = {
          ...this.catBarOptions,
          scales: {
            yAxes: [
              {
                ticks: {
                  beginAtZero: true,
                  max: maxValue + 1000,
                },
                gridLines: {
                  display: false,
                },
              },
            ],
            xAxes: [
              {
                gridLines: {
                  display: false,
                },
              },
            ],
          },
        };

        const sla_category = res.data.sla_category || [];
        this.catBarLabels = sla_category.map((item) => item.label);

        this.catBarData = [
          {
            label: 'Success',
            data: sla_category.map((item) => item.total_success),
            backgroundColor: '#1AC9E6',
            borderColor: '#1AC9E6',
          },
          {
            label: 'Failed',
            data: sla_category.map((item) => item.total_failed),
            backgroundColor: '#DB4C82',
            borderColor: '#DB4C82',
            borderWidth: 2,
          },
        ];
      });
  }

  private getStateData() {
    this.slaService
      .getStateList(this.startDate, this.endDate)
      .pipe(finalize(() => this.checLoading(1)))
      .subscribe((res) => {
        const sortedData = res.data.sla_states.sort(
          (a, b) => b.percentage - a.percentage
        );

        this.shipmentData = sortedData.map((item) => ({
          state: item.label,
          percentage: Number(item.percentage.toFixed(2)),
          shipments: item.total,
        }));

        this.totalShipmentState = res.data.total_shipment;
      });
  }

  private getDexList() {
    this.slaService
      .getDexList(this.startDate, this.endDate)
      .pipe(finalize(() => this.checLoading(1)))
      .subscribe((res) => {
        this.last_updated.push(res.data.last_updated);
        const dex = res.data.exceptions || [];
        this.dexChartLabels = dex.map((item) => item.label);
        this.dexChartData = dex
          .sort((a, b) => b.total - a.total)
          .map((item) => Number(item.percentage.toFixed(2)));
        this.dexSourceData = dex
          .sort((a, b) => b.total - a.total)
          .map((item, index) => ({
            label: item.label,
            count: item.total,
            percentage: Number(item.percentage.toFixed(2)),
            color: this.dexChartBackgroundColor[index],
          }));
      });
  }

  // disable right now
  // private getRtoData() {
  //   this.slaService.getRtoSummary().subscribe((res) => {
  //     console.log(res);
  //   });
  // }

  onDateRangePickerFormChange(event: any) {
    if(!event.start_date || !event.end_date) return;

    this.dateRangePickerForm.patchValue({
      start_date: event.start_date,
      end_date: event.end_date,
    });
    this.ngAfterViewInit();
  }

  private checLoading(val: number) {
    this.compleate = this.compleate + val;
    if (this.compleate === 4) {
      this.last_updated = this.last_updated.sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      );
      const formattingDate = moment(this.last_updated[0]).format(
        'DD MMM YYYY, hh:mm A'
      );
      this.updatedLastRefreshed = formattingDate;
      this.isLoading = false;
    }
  }

  get startDate() {
    const start_date = this.dateRangePickerForm.value.start_date;
    return moment(start_date).format('YYYY-MM-DD');
  }

  get endDate() {
    const end_date = this.dateRangePickerForm.value.end_date
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
}
