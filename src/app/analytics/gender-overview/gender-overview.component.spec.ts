import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenderOverviewComponent } from './gender-overview.component';

describe('GenderOverviewComponent', () => {
  let component: GenderOverviewComponent;
  let fixture: ComponentFixture<GenderOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GenderOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenderOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
