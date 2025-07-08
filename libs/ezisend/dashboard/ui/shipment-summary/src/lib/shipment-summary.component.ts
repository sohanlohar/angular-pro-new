import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SummaryTile } from '@pos/ezisend/dashboard/data-access/models';
import { CommonService } from '@pos/ezisend/shared/data-access/services';
import * as moment from 'moment';
import {
  BehaviorSubject,
  Subject,
  Subscription,
  catchError,
  takeUntil,
  tap,
} from 'rxjs';
import { en } from 'libs/ezisend/assets/en';
import { bm } from 'libs/ezisend/assets/my';
import { TranslationService } from 'libs/ezisend/shared-services/translate.service';
import { SingleDataSet, Label, Color } from 'ng2-charts';
import { ChartOptions, ChartType } from 'chart.js';
@Component({
  selector: 'pos-shipment-summary',
  templateUrl: './shipment-summary.component.html',
  styleUrls: ['./shipment-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ShipmentSummaryComponent implements OnInit, OnDestroy {
  idleDays = 30;
  $total_cod: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  $total_failed: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  $total_pending: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  currentDate = new Date();
  start_date = '';
  end_date = '';
  boxHeight = 'auto';
  protected _onDestroy = new Subject<void>();
  // Date Range
  dateRangePickerForm: FormGroup = this.fb.group({
    start_date: [moment().subtract(1, 'month')],
    end_date: [moment()],
  });
  public doughnutChartLabels: Label[] = ['COD', 'NON COD'];
  public doughnutChartData: SingleDataSet = [];
  public isEmptyDoughnutChart = true;
  public doughnutChartType: ChartType = 'doughnut';
  public doughnutColors: Color[] = [
    {
      backgroundColor: ['#008BD3', '#00AFAF'],
      borderColor: ['#008BD3', '#00AFAF'],
    },
  ];
  public doughnutChartLegend = false;
  public doughnutChartPlugins = [];
  /* doughnut chart */
  public doughnutChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    legend: { position: 'left' },
    tooltips: {
      callbacks: {
        label: (tooltipItem: any, data: any) => {
          const dataset = data.datasets[tooltipItem.datasetIndex];
          const total = dataset.data.reduce(
            (sum: any, value: any) => sum + value,
            0
          );
          const currentValue = dataset.data[tooltipItem.index];
          const percentage = isNaN((currentValue / total) * 100)
            ? 0
            : ((currentValue / total) * 100).toFixed(2);

          return `${
            data.labels[tooltipItem.index]
          }: ${currentValue} (${percentage}%)`;
        },
      },
    },
  };
  displayedColumns2: string[] = ['delivery_type', 'order_count', 'percentage'];
  dataSource2: any = [];

  statistics = {
    byShipment: 0,
    byState: 0,
    byProduct: 0,
    byPayment: 0,
  };

  languageData: any =
    localStorage.getItem('language') &&
    localStorage.getItem('language') === 'en'
      ? en.data.dashboard.insights
      : localStorage.getItem('language') &&
        localStorage.getItem('language') === 'my'
      ? bm.data.dashboard.insights
      : en.data.dashboard.insights;

  statusList = [
    'request-pickup',
    'pending-pickup',
    'live',
    'delivered',
    'failed-delivery',
    'returned',
  ];

  isLoadingStatus: { [key: string]: boolean } = {
    'request-pickup': false,
    live: false,
    delivered: false,
    'failed-delivery': false,
    returned: false,
  };

  private subscription: Subscription | undefined;

  data: any =
    localStorage.getItem('language') &&
    localStorage.getItem('language') === 'en'
      ? en.data
      : localStorage.getItem('language') &&
        localStorage.getItem('language') === 'my'
      ? bm.data
      : en.data;

  summaryTiles: SummaryTile[] = [
    {
      image: 'update',
      title: this.data?.dashboard?.pending_pickup,
      count: 0,
      link: 'pending-pickup',
      color: 'purple-theme-color',
    },
    {
      image: 'local_shipping',
      title: this.data?.dashboard?.live_shipments,
      link: 'live-shipment',
      count: 0,
      color: 'yellow-theme-color',
    },
    {
      image: 'how_to_reg',
      title: this.data?.dashboard?.delivered,
      link: 'delivered',
      count: 0,
      color: 'green-theme-color',
    },
    {
      image: 'close',
      title: this.data?.dashboard?.failed_deliveries,
      link: 'fail-delivered',
      count: 0,
      color: 'red-theme-color',
    },
    {
      image: 'front_hand',
      title: this.data?.dashboard?.returns,
      link: 'return',
      count: 0,
      color: 'gray-theme-color',
    },
  ];

  @HostListener('window:resize', []) updateMode() {
    this.boxHeight = window.innerWidth <= 1084 ? '130px' : 'auto';
  }

  constructor(
    public commonService: CommonService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private translate: TranslationService
  ) {}

  ngOnInit() {
    this.fetchConfig();
    this.translate.buttonClick$.subscribe(() => {
      if (localStorage.getItem('language') == 'en') {
        this.data = en.data;
      } else if (localStorage.getItem('language') == 'my') {
        this.data = bm.data;
      }
    });

    this.fetchShipmentByPaymentType();
  }

  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  fetchConfig() {
    this.commonService
      .fetchList('user', 'config')
      .pipe(takeUntil(this._onDestroy))
      .subscribe({
        next: (data) => {
          this.commonService.isCOD.next(data.data?.feature_cod);
          this.commonService.isCODUbat.next(data.data?.feature_codubat);
          this.commonService.isMelPlus.next(data.data?.feature_melplus);
          this.commonService.isMPS.next(data.data?.feature_mps);
          const firstNum = data.data.pusher_channels[1].split('-')[2].charAt(0);
          if (firstNum === '8') {
            this.commonService.masterAccount.next(true);
          } else {
            this.commonService.masterAccount.next(false);
          }
        },
        error: () => {
          this.commonService.openErrorDialog();
        },
      });
  }

  onDateRangePickerFormChange(event: any) {
    if (event) {
      this.start_date = moment(event.start_date)
        .startOf('day')
        .format('YYYY-MM-DDTHH:mm:ss[Z]');
      this.end_date = moment(event.end_date)
        .endOf('day')
        .format('YYYY-MM-DDTHH:mm:ss[Z]');
      this.commonService.googleEventPush({
        event: 'filter_section',
        event_category: 'SendParcel Pro - Dashboard',
        event_action: 'Filter Section',
        event_label: this.start_date + ' - ' + this.end_date,
      });
    } else {
      this.start_date = '';
      this.end_date = '';
    }

  }

  allStatusLoadingState(): boolean {
    return Object.values(this.isLoadingStatus).every(
      (value) => value === false
    );
  }

  fetchShipmentByPaymentType() {
    this.commonService
      .fetchList(
        'dashboard',
        `shipment/insights?category=shipments_by_payment_type`
      )
      .pipe(
        takeUntil(this._onDestroy),
        tap((data: any) => {
          let codTotal = 0;
          let nonCodTotal = 0;
          this.isEmptyDoughnutChart = data.data.length === 0 || data.data.every((item: any) => item.Count === 0);

          data.data.forEach((item: { Key: string; Count: number }) => {
            if (item.Key === 'COD') {
              codTotal += item.Count;
            } else if (item.Key === 'Non-COD') {
              nonCodTotal += item.Count;
            }
          });

          this.dataSource2 = [
            {
              name: 'COD',
              color: this.doughnutColors[0].backgroundColor?.[0],
              value: codTotal,
              percentage:
                codTotal + nonCodTotal !== 0
                  ? ((codTotal * 100) / (codTotal + nonCodTotal)).toFixed(2)
                  : 0,
            },
            {
              name: 'NON COD',
              color: this.doughnutColors[0].backgroundColor?.[1],
              value: nonCodTotal,
              percentage:
                codTotal + nonCodTotal !== 0
                  ? ((nonCodTotal * 100) / (codTotal + nonCodTotal)).toFixed(2)
                  : 0,
            },
          ];
          if (codTotal + nonCodTotal !== 0) {
            this.doughnutChartData = [codTotal, nonCodTotal];
          }

          // advancePieChart chart ends
          const codCountByDate: any = {};
          const nonCodCountByDate: any = {};

          data.data.forEach((item: any) => {
            const date = moment(item.Date).format('DD MMM');

            if (item.Key === 'COD') {
              codCountByDate[date] = (codCountByDate[date] || 0) + item.Count;
            } else {
              nonCodCountByDate[date] =
                (nonCodCountByDate[date] || 0) + item.Count;
            }
          });

          if (data.data.length > 0) {
            this.statistics.byPayment = data.data.reduce(
              (acc: any, curr: any) => (acc += curr.Count ? curr.Count : 0),
              0
            );
          }
        }),
        catchError((err: any) => {
          return err;
        })
      )
      .subscribe(() => {
        this.cdr.detectChanges();
      });
  }
}
