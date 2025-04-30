import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabConsultationsComponent } from './lab-consultations.component';

describe('LabConsultationsComponent', () => {
  let component: LabConsultationsComponent;
  let fixture: ComponentFixture<LabConsultationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LabConsultationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LabConsultationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
