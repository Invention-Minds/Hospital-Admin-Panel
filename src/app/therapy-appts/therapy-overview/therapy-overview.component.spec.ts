import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TherapyOverviewComponent } from './therapy-overview.component';

describe('TherapyOverviewComponent', () => {
  let component: TherapyOverviewComponent;
  let fixture: ComponentFixture<TherapyOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TherapyOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TherapyOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
