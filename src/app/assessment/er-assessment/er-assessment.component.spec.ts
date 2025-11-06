import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErAssessmentComponent } from './er-assessment.component';

describe('ErAssessmentComponent', () => {
  let component: ErAssessmentComponent;
  let fixture: ComponentFixture<ErAssessmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ErAssessmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ErAssessmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
