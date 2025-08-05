import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodayOtComponent } from './today-ot.component';

describe('TodayOtComponent', () => {
  let component: TodayOtComponent;
  let fixture: ComponentFixture<TodayOtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TodayOtComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodayOtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
