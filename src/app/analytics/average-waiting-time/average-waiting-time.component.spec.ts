import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AverageWaitingTimeComponent } from './average-waiting-time.component';

describe('AverageWaitingTimeComponent', () => {
  let component: AverageWaitingTimeComponent;
  let fixture: ComponentFixture<AverageWaitingTimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AverageWaitingTimeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AverageWaitingTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
