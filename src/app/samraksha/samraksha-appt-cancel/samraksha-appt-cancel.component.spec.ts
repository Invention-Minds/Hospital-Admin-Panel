import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamrakshaApptCancelComponent } from './samraksha-appt-cancel.component';

describe('SamrakshaApptCancelComponent', () => {
  let component: SamrakshaApptCancelComponent;
  let fixture: ComponentFixture<SamrakshaApptCancelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SamrakshaApptCancelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SamrakshaApptCancelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
