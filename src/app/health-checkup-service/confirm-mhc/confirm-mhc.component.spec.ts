import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmMhcComponent } from './confirm-mhc.component';

describe('ConfirmMhcComponent', () => {
  let component: ConfirmMhcComponent;
  let fixture: ComponentFixture<ConfirmMhcComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConfirmMhcComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmMhcComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
