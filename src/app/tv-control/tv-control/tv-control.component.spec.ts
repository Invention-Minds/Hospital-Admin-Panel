import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TvControlComponent } from './tv-control.component';

describe('TvControlComponent', () => {
  let component: TvControlComponent;
  let fixture: ComponentFixture<TvControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TvControlComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TvControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
