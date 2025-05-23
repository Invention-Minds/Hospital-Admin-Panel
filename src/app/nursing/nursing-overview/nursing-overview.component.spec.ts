import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NursingOverviewComponent } from './nursing-overview.component';

describe('NursingOverviewComponent', () => {
  let component: NursingOverviewComponent;
  let fixture: ComponentFixture<NursingOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NursingOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NursingOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
