import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpdOverviewComponent } from './opd-overview.component';

describe('OpdOverviewComponent', () => {
  let component: OpdOverviewComponent;
  let fixture: ComponentFixture<OpdOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OpdOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpdOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
