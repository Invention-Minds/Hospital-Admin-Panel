import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationCompleteComponent } from './estimation-complete.component';

describe('EstimationCompleteComponent', () => {
  let component: EstimationCompleteComponent;
  let fixture: ComponentFixture<EstimationCompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationCompleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationCompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
