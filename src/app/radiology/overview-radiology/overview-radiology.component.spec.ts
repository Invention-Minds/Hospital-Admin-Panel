import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverviewRadiologyComponent } from './overview-radiology.component';

describe('OverviewRadiologyComponent', () => {
  let component: OverviewRadiologyComponent;
  let fixture: ComponentFixture<OverviewRadiologyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OverviewRadiologyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OverviewRadiologyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
