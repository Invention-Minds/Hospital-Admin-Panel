import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpdTypeComponent } from './opd-type.component';

describe('OpdTypeComponent', () => {
  let component: OpdTypeComponent;
  let fixture: ComponentFixture<OpdTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OpdTypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpdTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
