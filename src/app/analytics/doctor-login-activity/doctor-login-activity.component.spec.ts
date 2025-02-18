import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorLoginActivityComponent } from './doctor-login-activity.component';

describe('DoctorLoginActivityComponent', () => {
  let component: DoctorLoginActivityComponent;
  let fixture: ComponentFixture<DoctorLoginActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DoctorLoginActivityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorLoginActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
