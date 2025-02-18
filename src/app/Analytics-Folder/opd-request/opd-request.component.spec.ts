import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpdRequestComponent } from './opd-request.component';

describe('OpdRequestComponent', () => {
  let component: OpdRequestComponent;
  let fixture: ComponentFixture<OpdRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OpdRequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpdRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
