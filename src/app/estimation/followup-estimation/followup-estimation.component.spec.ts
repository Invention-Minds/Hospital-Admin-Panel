import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FollowupEstimationComponent } from './followup-estimation.component';

describe('FollowupEstimationComponent', () => {
  let component: FollowupEstimationComponent;
  let fixture: ComponentFixture<FollowupEstimationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FollowupEstimationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FollowupEstimationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
