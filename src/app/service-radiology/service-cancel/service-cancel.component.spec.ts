import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCancelComponent } from './service-cancel.component';

describe('ServiceCancelComponent', () => {
  let component: ServiceCancelComponent;
  let fixture: ComponentFixture<ServiceCancelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceCancelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceCancelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
