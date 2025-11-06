import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TherapistApptsComponent } from './therapist-appts.component';

describe('TherapistApptsComponent', () => {
  let component: TherapistApptsComponent;
  let fixture: ComponentFixture<TherapistApptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TherapistApptsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TherapistApptsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
