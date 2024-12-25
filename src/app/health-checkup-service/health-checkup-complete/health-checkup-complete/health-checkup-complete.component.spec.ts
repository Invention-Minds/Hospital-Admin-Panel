import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthCheckupCompleteComponent } from './health-checkup-complete.component';

describe('HealthCheckupCompleteComponent', () => {
  let component: HealthCheckupCompleteComponent;
  let fixture: ComponentFixture<HealthCheckupCompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HealthCheckupCompleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HealthCheckupCompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
