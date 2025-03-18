import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceConfirmComponent } from './service-confirm.component';

describe('ServiceConfirmComponent', () => {
  let component: ServiceConfirmComponent;
  let fixture: ComponentFixture<ServiceConfirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceConfirmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
