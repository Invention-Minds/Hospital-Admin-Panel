import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MhcOverviewComponent } from './mhc-overview.component';

describe('MhcOverviewComponent', () => {
  let component: MhcOverviewComponent;
  let fixture: ComponentFixture<MhcOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MhcOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MhcOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
