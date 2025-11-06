import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TherapistOverviewComponent } from './therapist-overview.component';

describe('TherapistOverviewComponent', () => {
  let component: TherapistOverviewComponent;
  let fixture: ComponentFixture<TherapistOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TherapistOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TherapistOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
