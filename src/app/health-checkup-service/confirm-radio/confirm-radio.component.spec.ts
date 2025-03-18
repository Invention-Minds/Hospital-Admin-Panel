import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmRadioComponent } from './confirm-radio.component';

describe('ConfirmRadioComponent', () => {
  let component: ConfirmRadioComponent;
  let fixture: ComponentFixture<ConfirmRadioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConfirmRadioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmRadioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
