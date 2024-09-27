import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentConfirmComponent } from './appointment-confirm.component';

describe('AppointmentConfirmComponent', () => {
  let component: AppointmentConfirmComponent;
  let fixture: ComponentFixture<AppointmentConfirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppointmentConfirmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppointmentConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
