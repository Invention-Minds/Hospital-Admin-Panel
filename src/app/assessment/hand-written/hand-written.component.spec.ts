import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HandWrittenComponent } from './hand-written.component';

describe('HandWrittenComponent', () => {
  let component: HandWrittenComponent;
  let fixture: ComponentFixture<HandWrittenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HandWrittenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HandWrittenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
