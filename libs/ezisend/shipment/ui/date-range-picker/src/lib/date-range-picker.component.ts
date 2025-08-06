import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  Renderer2,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { FormGroup, FormGroupDirective } from '@angular/forms';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslationService } from '../../../../../shared-services/translate.service';
import * as moment from 'moment';
import { bm } from 'libs/ezisend/assets/my';
import { en } from 'libs/ezisend/assets/en';
import { DaterangepickerDirective } from 'ngx-daterangepicker-material';

export const DATE_RANGE_FORMATS = {
  parse: {
    dateInput: 'DD MMM YY',
  },
  display: {
    dateInput: 'DD MMM YY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'pos-date-range-picker',
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.scss'],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: DATE_RANGE_FORMATS },
  ],
})
export class DateRangePickerComponent implements OnInit {
  public languageData: any =
    localStorage.getItem('language') &&
    localStorage.getItem('language') === 'en'
      ? en.data.dialog_box_data
      : localStorage.getItem('language') &&
        localStorage.getItem('language') === 'my'
      ? bm.data.dialog_box_data
      : en.data.dialog_box_data;
  @ViewChild('picker') picker: any;
  @ViewChild('inputField') inputField!: ElementRef;
  @ViewChild(DaterangepickerDirective)
  pickerDirective!: DaterangepickerDirective;
  currentDate = new Date();
  @Input() maxDate: Date | undefined;
  @Input() minDate: Date | undefined;
  @Input() isInvalidDate: ((m: moment.Moment) => boolean) | any;
  @Input() singleDateOnly = false;
  @Input() autoApply = false;
  @Input() initialStartDate?: string;
  @Input() initialEndDate?: string;
  @Input() initialRange: 'last30' | 'next30' | null | undefined = 'last30';
  form!: FormGroup;
  @Output() formChange = new EventEmitter();
  @Output() pickerStateChanged = new EventEmitter<boolean>();
  isPickerOpen = false;

  selected: any;
  alwaysShowCalendars = true;
  showRangeLabelOnInput = false;
  keepCalendarOpeningWithRange = true;
  invalidDates: any[] = [];
  tooltips = [
    { date: moment(), text: 'Today is just unselectable' },
    { date: moment().add(2, 'days'), text: 'Yeeeees!!!' },
  ];
  inlineDateTime: any;

  ranges: any = {
    Today: [moment(), moment()],
    Yesterday: [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
    'Last 10 Days': [moment().subtract(9, 'days'), moment()],
    'Last 30 Days': [moment().subtract(29, 'days'), moment()],
    'Last 90 Days': [moment().subtract(89, 'days'), moment()],
    'Week to Date': [moment().isoWeekday(1), moment()],
    'Month to Date': [moment().startOf('month'), moment()],
    'Custom Range': [moment().subtract(7, 'days'), moment()],
  };

  data: any =
    localStorage.getItem('language') &&
    localStorage.getItem('language') === 'en'
      ? en.data
      : localStorage.getItem('language') &&
        localStorage.getItem('language') === 'my'
      ? bm.data
      : en.data;

  constructor(
    private roofFormGroup: FormGroupDirective,
    private translate: TranslationService,
    private renderer: Renderer2,
    private _snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.translate.buttonClick$.subscribe(() => {
      if (localStorage.getItem('language') == 'en') {
        this.languageData = en.data.dialog_box_data;
      } else if (localStorage.getItem('language') == 'my') {
        this.languageData = bm.data.dialog_box_data;
      }
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    this.translate.buttonClick$.subscribe(() => {
      if (localStorage.getItem('language') == 'en') {
        this.data = en.data;
      } else if (localStorage.getItem('language') == 'my') {
        this.data = bm.data;
      }
    });
    this.form = this.roofFormGroup.control;

    // Use parent-provided initial dates if available
    let start = moment().startOf('day');
    let end = moment().endOf('day');

    if (this.initialRange === 'next30') {
      start = moment().startOf('day');
      end = moment().add(30, 'days').endOf('day');
    } else if (this.initialStartDate && this.initialEndDate) {
      start = moment(this.initialStartDate).startOf('day');
      end = moment(this.initialEndDate).endOf('day');
    } else {
      // Default: last 30 days
      start = moment().subtract(1, 'month').startOf('day');
      end = moment().endOf('day');
    }

    this.selected = {
      startDate: start,
      endDate: end,
    };
    this.form.patchValue({
      start_date: start,
      end_date: end,
    });
  }

  getUtcRangeFromDayjsRange(range: { dates: any[] }) {
    if (!range?.dates?.length) {
      return { start_date: null, end_date: null };
    }
    const startDayjs = range.dates[0];
    const endDayjs = range.dates[1] || range.dates[0];
    const startLocalMidnight = new Date(
      startDayjs.year(),
      startDayjs.month(),
      startDayjs.date(),
      0,
      0,
      0,
      0
    );
    const endLocalEndOfDay = new Date(
      endDayjs.year(),
      endDayjs.month(),
      endDayjs.date(),
      23,
      59,
      59,
      999
    );
    return {
      start_date: startLocalMidnight.toISOString(),
      end_date: endLocalEndOfDay.toISOString(),
    };
  }

  rangeClicked(range: any): void {
    const label = range.label?.trim();
    const isCustomRange = label === 'Custom Range';
    // For Mobile view, toggle the visibility of the calendar popup
    if (this.isMobileView) {
      const popup = document.querySelector(
        '.md-drppicker, .drp-calendar'
      ) as HTMLElement;
      if (isCustomRange) {
        popup?.classList.add('show-calendars');
      } else {
        popup?.classList.remove('show-calendars');
        this.pickerDirective.hide();
      }
    }
    const { start_date, end_date } = this.getUtcRangeFromDayjsRange(range);
    const localStartDate = new Date(start_date || ''); // Local time
    const localEndDate = new Date(end_date || ''); // Local time

    this.selected = {
      startDate: localStartDate,
      endDate: localEndDate,
    };
    this.form.patchValue({
      start_date: start_date,
      end_date: end_date,
    });

    if (this.isMobileView && !isCustomRange) {
      this.onApplyDate();
    }
  }

  datesUpdated(range: any): void {
    if (range?.startDate && range?.endDate) {
      const start = moment(range.startDate['$d']);
      const end = moment(range.endDate['$d']);
      const maxDuration = moment.duration(3, 'months');
      const actualDuration = moment.duration(end.diff(start));

      if (actualDuration.asDays() > maxDuration.asDays()) {
        this._snackBar.open(`${this.languageData.three_months_limit}`, 'ok', {
          duration: 4000,
          verticalPosition: 'bottom',
          horizontalPosition: 'center',
        });
        // Auto-correct to 3-month range
        const correctedEnd = moment(start).add(3, 'months');
        this.selected = {
          startDate: start,
          endDate: correctedEnd,
        };

        this.form.patchValue({
          start_date: start, // Use local Date object for UI display
          end_date: correctedEnd, // Use local Date object for UI display
        });
        return;
      }
      const startLocal = range.startDate.local().startOf('day');

      let endLocal;
      if (!range.startDate.isSame(range.endDate, 'day')) {
        // Subtract 1 day from endDate, then get endOf('day')
        endLocal = range.endDate.subtract(1, 'day').local().endOf('day');
      } else {
        // single day - end of that day
        endLocal = range.startDate.local().endOf('day');
      }

      // Convert to JS Date (local time)
      const startDate = startLocal.toDate();
      const endDate = endLocal.toDate();

      // Convert local Date to UTC ISO string
      const utcStartISOString = startDate.toISOString();
      const utcEndISOString = endDate.toISOString();

      this.form.patchValue({
        start_date: utcStartISOString,
        end_date: utcEndISOString,
      });
      this.onApplyDate();
    }
  }

  onApplyDate() {
    if (this.form.value.start_date && this.form.value.end_date) {
      this.formChange.emit(this.form.value);
    } else if (!this.form.value.start_date && !this.form.value.end_date) {
      this.formChange.emit();
    }
  }

  openDate() {
    this.pickerDirective.open();
  }

  chosenDateTime(e: any): void {
    this.inlineDateTime = e;
  }

  onClearDate() {
    this.selected = null;
    this.form.reset();
    this.formChange.emit(this.form.value);
  }

  /**
   * Method Name: openPicker
   *
   * Input Parameters:
   *   - None
   *
   * Output Parameters:
   *   - void: This method does not return any value
   *
   * Purpose:
   *   - To open the date picker and set the width of the calendar container
   *
   * Author:
   *   - [Saepul Latif]
   *
   * Description:
   *   - This method opens the date picker using the open method on the picker instance.
   *     After opening the picker, it calls the setWidthContainerCalendar method to adjust
   *     the width of the calendar container to match the width of the input field.
   */
  onPickerOpened() {
    this.pickerStateChanged.emit(true);
    if (!this.isMobileView) return;
    this.picker.open();
    this.setWidthContainerCalendar();
    this.isPickerOpen = true;
  }

  /**
   * Method Name: setWidthContainerCalendar
   *
   * Input Parameters:
   *   - None
   *
   * Output Parameters:
   *   - void: This method does not return any value
   *
   * Purpose:
   *   - To set the width of the date picker calendar container to match the width of the input field
   *
   * Author:
   *   - [Saepul Latif]
   *
   * Description:
   *   - This method calculates the width of the input field using the nativeElement's offsetWidth property.
   *     It then selects the overlay panel of the date picker using a query selector and sets its width to match
   *     the input field's width using the renderer's setStyle method. If the overlay panel is not found,
   *     the method does nothing.
   */
  setWidthContainerCalendar() {
    const inputWidth = this.inputField.nativeElement.offsetWidth;
    const overlayPanel = document.querySelector(
      '.mat-datepicker-content .mat-calendar'
    );
    if (overlayPanel) {
      this.renderer.setStyle(overlayPanel, 'width', inputWidth + 'px');
    }
  }

  defaultInvalidDate = (m: any): boolean => {
    return this.invalidDates.some((d) => d.isSame(m, 'day'));
  };

  isTooltipDate = (m: any): string | boolean | null => {
    const tooltip = this.tooltips.find((tt) => tt.date.isSame(m, 'day'));
    if (tooltip) {
      return tooltip.text;
    } else {
      return false;
    }
  };

  get isMobileView(): boolean {
    return window.innerWidth <= 665;
  }
}
