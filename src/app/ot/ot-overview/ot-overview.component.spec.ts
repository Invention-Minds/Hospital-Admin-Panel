import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtOverviewComponent } from './ot-overview.component';

describe('OtOverviewComponent', () => {
  let component: OtOverviewComponent;
  let fixture: ComponentFixture<OtOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OtOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OtOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
