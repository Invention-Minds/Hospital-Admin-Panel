import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArrivedConsultationComponent } from './arrived-consultation.component';

describe('ArrivedConsultationComponent', () => {
  let component: ArrivedConsultationComponent;
  let fixture: ComponentFixture<ArrivedConsultationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ArrivedConsultationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArrivedConsultationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
