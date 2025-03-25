import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamrakshaApptCompleteComponent } from './samraksha-appt-complete.component';

describe('SamrakshaApptCompleteComponent', () => {
  let component: SamrakshaApptCompleteComponent;
  let fixture: ComponentFixture<SamrakshaApptCompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SamrakshaApptCompleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SamrakshaApptCompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
