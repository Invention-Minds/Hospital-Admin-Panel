import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamrakshaApptConfirmComponent } from './samraksha-appt-confirm.component';

describe('SamrakshaApptConfirmComponent', () => {
  let component: SamrakshaApptConfirmComponent;
  let fixture: ComponentFixture<SamrakshaApptConfirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SamrakshaApptConfirmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SamrakshaApptConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
