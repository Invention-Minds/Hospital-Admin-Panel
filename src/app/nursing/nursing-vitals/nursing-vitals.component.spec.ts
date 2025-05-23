import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NursingVitalsComponent } from './nursing-vitals.component';

describe('NursingVitalsComponent', () => {
  let component: NursingVitalsComponent;
  let fixture: ComponentFixture<NursingVitalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NursingVitalsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NursingVitalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
