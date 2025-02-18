import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpdTimeWiseComponent } from './opd-time-wise.component';

describe('OpdTimeWiseComponent', () => {
  let component: OpdTimeWiseComponent;
  let fixture: ComponentFixture<OpdTimeWiseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OpdTimeWiseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpdTimeWiseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
