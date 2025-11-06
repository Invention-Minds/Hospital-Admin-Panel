import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TherapyFormComponent } from './therapy-form.component';

describe('TherapyFormComponent', () => {
  let component: TherapyFormComponent;
  let fixture: ComponentFixture<TherapyFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TherapyFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TherapyFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
