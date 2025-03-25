import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamrakshaApptComponent } from './samraksha-appt.component';

describe('SamrakshaApptComponent', () => {
  let component: SamrakshaApptComponent;
  let fixture: ComponentFixture<SamrakshaApptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SamrakshaApptComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SamrakshaApptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
