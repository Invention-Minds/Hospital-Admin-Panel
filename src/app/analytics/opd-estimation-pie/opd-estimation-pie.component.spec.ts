import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpdEstimationPieComponent } from './opd-estimation-pie.component';

describe('OpdEstimationPieComponent', () => {
  let component: OpdEstimationPieComponent;
  let fixture: ComponentFixture<OpdEstimationPieComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OpdEstimationPieComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpdEstimationPieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
