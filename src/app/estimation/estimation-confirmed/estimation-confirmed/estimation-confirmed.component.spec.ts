import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationConfirmedComponent } from './estimation-confirmed.component';

describe('EstimationConfirmedComponent', () => {
  let component: EstimationConfirmedComponent;
  let fixture: ComponentFixture<EstimationConfirmedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationConfirmedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationConfirmedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
