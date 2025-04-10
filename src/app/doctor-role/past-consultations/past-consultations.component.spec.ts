import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastConsultationsComponent } from './past-consultations.component';

describe('PastConsultationsComponent', () => {
  let component: PastConsultationsComponent;
  let fixture: ComponentFixture<PastConsultationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PastConsultationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastConsultationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
