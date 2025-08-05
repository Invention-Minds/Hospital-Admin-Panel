import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtTvDisplayComponent } from './ot-tv-display.component';

describe('OtTvDisplayComponent', () => {
  let component: OtTvDisplayComponent;
  let fixture: ComponentFixture<OtTvDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OtTvDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OtTvDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
