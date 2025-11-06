import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErOverviewComponent } from './er-overview.component';

describe('ErOverviewComponent', () => {
  let component: ErOverviewComponent;
  let fixture: ComponentFixture<ErOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ErOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ErOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
