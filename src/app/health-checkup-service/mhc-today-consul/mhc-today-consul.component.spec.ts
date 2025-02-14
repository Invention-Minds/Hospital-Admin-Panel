import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MhcTodayConsulComponent } from './mhc-today-consul.component';

describe('MhcTodayConsulComponent', () => {
  let component: MhcTodayConsulComponent;
  let fixture: ComponentFixture<MhcTodayConsulComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MhcTodayConsulComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MhcTodayConsulComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
