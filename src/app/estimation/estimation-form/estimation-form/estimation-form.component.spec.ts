import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationFormComponent } from './estimation-form.component';

describe('EstimationFormComponent', () => {
  let component: EstimationFormComponent;
  let fixture: ComponentFixture<EstimationFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
