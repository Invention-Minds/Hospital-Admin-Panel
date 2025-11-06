import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TherapyCompletedComponent } from './therapy-completed.component';

describe('TherapyCompletedComponent', () => {
  let component: TherapyCompletedComponent;
  let fixture: ComponentFixture<TherapyCompletedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TherapyCompletedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TherapyCompletedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
