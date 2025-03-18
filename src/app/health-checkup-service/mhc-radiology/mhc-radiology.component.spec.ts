import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MhcRadiologyComponent } from './mhc-radiology.component';

describe('MhcRadiologyComponent', () => {
  let component: MhcRadiologyComponent;
  let fixture: ComponentFixture<MhcRadiologyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MhcRadiologyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MhcRadiologyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
