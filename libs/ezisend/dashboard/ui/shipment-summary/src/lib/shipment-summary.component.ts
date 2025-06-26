import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
  HostListener,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SummaryTile } from '@pos/ezisend/dashboard/data-access/models';
import { CommonService } from '@pos/ezisend/shared/data-access/services';
import * as moment from 'moment';
import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription,
  catchError,
  finalize,
  forkJoin,
  map,
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

  public doughnutChartLabels: Label[] = ['COD', 'NON COD'];
  public doughnutChartData: SingleDataSet = [];
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

  // Date Range
  dateRangePickerForm: FormGroup = this.fb.group({
    start_date: [moment().subtract(1, 'month')],
    end_date: [moment()],
  });

  ngOnInit() {
    this.fetchConfig();
    this.fetchDashboardSummary(
      moment(this.dateRangePickerForm.value.start_date)
        .startOf('day')
        .utc()
        .format('YYYY-MM-DDTHH:mm:ss[Z]'),
      moment(this.dateRangePickerForm.value.end_date)
        .endOf('day')
        .utc()
        .format('YYYY-MM-DDTHH:mm:ss[Z]')
    );
    this.translate.buttonClick$.subscribe(() => {
      if (localStorage.getItem('language') == 'en') {
        this.data = en.data;
      } else if (localStorage.getItem('language') == 'my') {
        this.data = bm.data;
      }
      this.fetchDashboardSummary(
        moment(this.dateRangePickerForm.value.start_date)
          .startOf('day')
          .utc()
          .format('YYYY-MM-DDTHH:mm:ss[Z]'),
        moment(this.dateRangePickerForm.value.end_date)
          .endOf('day')
          .utc()
          .format('YYYY-MM-DDTHH:mm:ss[Z]')
      );
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
        .utc()
        .format('YYYY-MM-DDTHH:mm:ss[Z]');
      this.end_date = moment(event.end_date)
        .endOf('day')
        .utc()
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

    this.fetchDashboardSummary(this.start_date, this.end_date);
  }

  fetchDashboardSummary(startDate?: string, endDate?: string) {
    // create observable for all status
    const query = `count-shipments?status=`;
    const date =
      startDate !== '' ? `&start_date=${startDate}&end_date=${endDate}` : '';
    const requests$: Observable<any>[] = this.statusList.map((el) => {
      this.isLoadingStatus[el] = true;
      const newQuery = query + el;
      return this.commonService.fetchList('dashboard', newQuery + date).pipe(
        map((response) => ({
          status: el,
          count: response.data.count,
          sum_cod: response.data.sum_cod,
        })),
        finalize(() => {
          this.isLoadingStatus[el] = false;
        }),
        takeUntil(this._onDestroy)
      );
    });

    //join all observable status and subscribe once
    forkJoin(requests$).subscribe({
      next: (responses) => {
        responses.forEach((res: any) => {
          this.mappingDataStatus(res);
        });

        if (this.commonService.isCOD.getValue()) {
          this.commonService.isCOD
            .pipe(takeUntil(this._onDestroy))
            .subscribe(() => {
              const pendingPickup = responses.find(
                (el) => el.status === 'delivered'
              );
              const findTotalFailed = responses.find(
                (el) => el.status === 'failed-delivery'
              );
              const findTotalPending = responses.find(
                (el) => el.status === 'live'
              );

              if (pendingPickup) {
                this.$total_cod.next(pendingPickup.sum_cod);
              }

              if (findTotalFailed) {
                this.$total_failed.next(findTotalFailed.sum_cod);
              }

              if (findTotalPending) {
                this.$total_pending.next(findTotalPending.sum_cod);
              }
            });
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.commonService.openErrorDialog();
        this.cdr.detectChanges();
      },
    });
  }

  // create mapping data for result subscribe
  private mappingDataStatus(res: {
    count: number;
    sum: number;
    status: string;
  }) {
    switch (res.status) {
      case 'pending-pickup':
        this.summaryTiles[0].count = res.count;
        this.summaryTiles[0].title = this.data.dashboard?.pending_pickup;
        break;

      case 'live':
        this.summaryTiles[1].count = res.count;
        this.summaryTiles[1].title = this.data.dashboard?.live_shipments;
        break;

      case 'delivered':
        this.summaryTiles[2].count = res.count;
        this.summaryTiles[2].title = this.data.dashboard?.delivered;
        break;

      case 'failed-delivery':
        this.summaryTiles[3].count = res.count;
        this.summaryTiles[3].title = this.data.dashboard?.failed_deliveries;
        break;

      case 'returned':
        this.summaryTiles[4].count = res.count;
        this.summaryTiles[4].title = this.data.dashboard?.returns;
        break;

      default:
        console.log(`Unexpected status: ${res.status}`);
    }
  }

  allStatusLoadingState(): boolean {
    return Object.values(this.isLoadingStatus).every(
      (value) => value === false
    );
  }

  fetchShipmentByPaymentType() {
    console.log('fetchShipmentByPaymentType')
    this.commonService
      .fetchList(
        'dashboard',
        `shipment/insights?category=shipments_by_payment_type`
      )
      .pipe(
        takeUntil(this._onDestroy),
        tap((data: any) => {
          console.log('insight', data)

          let codTotal = 0;
          let nonCodTotal = 0;

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
