import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-estimation-lock',
  templateUrl: './estimation-lock.component.html',
  styleUrl: './estimation-lock.component.css'
})
export class EstimationLockComponent {
  @Input() showDialog: boolean = false; // Controls visibility
  @Input() userId: string = 'another user';
  @Output() close = new EventEmitter<void>(); // Emits event when dialog is closed

  closeDialog(): void {
    this.close.emit();
    this.showDialog = false;
    // console.log('false',this.showDialog)
  }
}
