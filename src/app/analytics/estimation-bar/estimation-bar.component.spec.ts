import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationBarComponent } from './estimation-bar.component';

describe('EstimationBarComponent', () => {
  let component: EstimationBarComponent;
  let fixture: ComponentFixture<EstimationBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
