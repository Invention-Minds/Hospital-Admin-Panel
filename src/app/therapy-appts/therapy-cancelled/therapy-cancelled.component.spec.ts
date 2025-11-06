import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TherapyCancelledComponent } from './therapy-cancelled.component';

describe('TherapyCancelledComponent', () => {
  let component: TherapyCancelledComponent;
  let fixture: ComponentFixture<TherapyCancelledComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TherapyCancelledComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TherapyCancelledComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
