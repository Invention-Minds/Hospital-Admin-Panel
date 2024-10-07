import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorOverviewComponent } from './doctor-overview.component';

describe('DoctorOverviewComponent', () => {
  let component: DoctorOverviewComponent;
  let fixture: ComponentFixture<DoctorOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DoctorOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
