import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpdPrintComponent } from './opd-print.component';

describe('OpdPrintComponent', () => {
  let component: OpdPrintComponent;
  let fixture: ComponentFixture<OpdPrintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OpdPrintComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpdPrintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
