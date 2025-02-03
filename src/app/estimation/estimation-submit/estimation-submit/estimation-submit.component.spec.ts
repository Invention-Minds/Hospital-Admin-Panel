import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationSubmitComponent } from './estimation-submit.component';

describe('EstimationSubmitComponent', () => {
  let component: EstimationSubmitComponent;
  let fixture: ComponentFixture<EstimationSubmitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationSubmitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationSubmitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
