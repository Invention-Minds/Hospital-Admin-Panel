import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCompleteComponent } from './service-complete.component';

describe('ServiceCompleteComponent', () => {
  let component: ServiceCompleteComponent;
  let fixture: ComponentFixture<ServiceCompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceCompleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceCompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
