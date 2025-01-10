import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodayConsultationsComponent } from './today-consultations.component';

describe('TodayConsultationsComponent', () => {
  let component: TodayConsultationsComponent;
  let fixture: ComponentFixture<TodayConsultationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TodayConsultationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodayConsultationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
