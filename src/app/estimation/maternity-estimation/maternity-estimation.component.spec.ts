import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaternityEstimationComponent } from './maternity-estimation.component';

describe('MaternityEstimationComponent', () => {
  let component: MaternityEstimationComponent;
  let fixture: ComponentFixture<MaternityEstimationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaternityEstimationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaternityEstimationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
