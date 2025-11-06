import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TherapyConfirmedComponent } from './therapy-confirmed.component';

describe('TherapyConfirmedComponent', () => {
  let component: TherapyConfirmedComponent;
  let fixture: ComponentFixture<TherapyConfirmedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TherapyConfirmedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TherapyConfirmedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
