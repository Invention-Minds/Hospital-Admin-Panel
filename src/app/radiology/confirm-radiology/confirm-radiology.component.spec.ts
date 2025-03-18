import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmRadiologyComponent } from './confirm-radiology.component';

describe('ConfirmRadiologyComponent', () => {
  let component: ConfirmRadiologyComponent;
  let fixture: ComponentFixture<ConfirmRadiologyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConfirmRadiologyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmRadiologyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
