import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtimationComponent } from './extimation.component';

describe('ExtimationComponent', () => {
  let component: ExtimationComponent;
  let fixture: ComponentFixture<ExtimationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExtimationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExtimationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
