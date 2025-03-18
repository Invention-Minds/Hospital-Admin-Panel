import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MhcWaitingTimeComponent } from './mhc-waiting-time.component';

describe('MhcWaitingTimeComponent', () => {
  let component: MhcWaitingTimeComponent;
  let fixture: ComponentFixture<MhcWaitingTimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MhcWaitingTimeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MhcWaitingTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
