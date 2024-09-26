import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalOverviewComponent } from './total-overview.component';

describe('TotalOverviewComponent', () => {
  let component: TotalOverviewComponent;
  let fixture: ComponentFixture<TotalOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TotalOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TotalOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
