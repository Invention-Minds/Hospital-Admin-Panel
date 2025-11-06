import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpdAssessmentComponent } from './opd-assessment.component';

describe('OpdAssessmentComponent', () => {
  let component: OpdAssessmentComponent;
  let fixture: ComponentFixture<OpdAssessmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OpdAssessmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpdAssessmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
