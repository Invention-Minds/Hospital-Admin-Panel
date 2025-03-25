import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamraskhaApptOverviewComponent } from './samraskha-appt-overview.component';

describe('SamraskhaApptOverviewComponent', () => {
  let component: SamraskhaApptOverviewComponent;
  let fixture: ComponentFixture<SamraskhaApptOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SamraskhaApptOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SamraskhaApptOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
