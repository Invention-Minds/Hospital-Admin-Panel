import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationRequestComponent } from './estimation-request.component';

describe('EstimationRequestComponent', () => {
  let component: EstimationRequestComponent;
  let fixture: ComponentFixture<EstimationRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationRequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
