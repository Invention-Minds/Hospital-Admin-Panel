import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorsListOverviewComponent } from './doctors-list-overview.component';

describe('DoctorsListOverviewComponent', () => {
  let component: DoctorsListOverviewComponent;
  let fixture: ComponentFixture<DoctorsListOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DoctorsListOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorsListOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
