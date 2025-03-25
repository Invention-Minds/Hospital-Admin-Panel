import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamrakshaApptRepeatComponent } from './samraksha-appt-repeat.component';

describe('SamrakshaApptRepeatComponent', () => {
  let component: SamrakshaApptRepeatComponent;
  let fixture: ComponentFixture<SamrakshaApptRepeatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SamrakshaApptRepeatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SamrakshaApptRepeatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
