import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlaDashboardPageComponent } from './sla-dashboard-page.component';

describe('SlaDashboardPageComponent', () => {
  let component: SlaDashboardPageComponent;
  let fixture: ComponentFixture<SlaDashboardPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SlaDashboardPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SlaDashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
