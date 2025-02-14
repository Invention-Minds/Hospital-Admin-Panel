import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MhcFormComponent } from './mhc-form.component';

describe('MhcFormComponent', () => {
  let component: MhcFormComponent;
  let fixture: ComponentFixture<MhcFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MhcFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MhcFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
