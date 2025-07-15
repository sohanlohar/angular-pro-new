import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlaDashboardPageComponent } from './component/sla-dashboard-page/sla-dashboard-page.component';
import { PageLayoutModule } from '@pos/ezisend/shared/ui/page-layout';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule } from '@angular/forms';
import { EzisendShipmentUiDateRangePickerModule } from '@pos/ezisend/shipment/ui/date-range-picker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { EzisendDashboardUiCodOrderModule } from '@pos/ezisend/dashboard/ui/cod-order';
import { MatTableModule } from '@angular/material/table';
import { ChartsModule } from 'ng2-charts';
import { MatTooltipModule } from '@angular/material/tooltip';
@NgModule({
  imports: [
    CommonModule,
    PageLayoutModule,
    FormsModule,
    NgxChartsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    FormsModule,
    MatProgressSpinnerModule,
    EzisendShipmentUiDateRangePickerModule,
    MatMenuModule,
    EzisendDashboardUiCodOrderModule,
    MatTableModule,
    ChartsModule,
    MatTooltipModule,
  ],
  declarations: [SlaDashboardPageComponent],
  exports: [SlaDashboardPageComponent],
})
export class EzisendSlaDashboardModule {}
