import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutComponent } from './layout.component';

import { RouterModule } from '@angular/router';
import { NavHeaderModule } from '@pos/ezisend/shell/ui/nav-header';
import { NavSidebarModule } from '@pos/ezisend/shell/ui/nav-sidebar';
import { EzisendShellUiNavFooterModule } from '@pos/ezisend/shell/ui/nav-footer'

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  imports: [
    CommonModule,
    MatSidenavModule,
    NavHeaderModule,
    NavSidebarModule,
    RouterModule,
    MatProgressSpinnerModule,
    EzisendShellUiNavFooterModule,
    MatIconModule
  ],
  declarations: [LayoutComponent],
  exports: [LayoutComponent],
})
export class EzisendShellLayoutModule {}
