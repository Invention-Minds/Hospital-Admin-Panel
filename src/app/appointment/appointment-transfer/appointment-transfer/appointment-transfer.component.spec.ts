import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentTransferComponent } from './appointment-transfer.component';

describe('AppointmentTransferComponent', () => {
  let component: AppointmentTransferComponent;
  let fixture: ComponentFixture<AppointmentTransferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppointmentTransferComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppointmentTransferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
