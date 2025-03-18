import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferredComponent } from './referred.component';

describe('ReferredComponent', () => {
  let component: ReferredComponent;
  let fixture: ComponentFixture<ReferredComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReferredComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReferredComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
