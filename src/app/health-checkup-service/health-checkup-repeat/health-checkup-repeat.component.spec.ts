import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthCheckupRepeatComponent } from './health-checkup-repeat.component';

describe('HealthCheckupRepeatComponent', () => {
  let component: HealthCheckupRepeatComponent;
  let fixture: ComponentFixture<HealthCheckupRepeatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HealthCheckupRepeatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HealthCheckupRepeatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
