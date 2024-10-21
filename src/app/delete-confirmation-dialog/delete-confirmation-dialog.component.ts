import { Component, EventEmitter, Input, Output } from '@angular/core';


@Component({
  selector: 'app-delete-confirmation-dialog',
  templateUrl: './delete-confirmation-dialog.component.html',
  styleUrl: './delete-confirmation-dialog.component.css'
})
export class DeleteConfirmationDialogComponent {
  @Input() showDialog: boolean = false; // Controls visibility
  @Output() close = new EventEmitter<void>(); // Emits event when dialog is closed

  closeDialog(): void {
    this.close.emit();
    this.showDialog = false;
    console.log('false',this.showDialog)
  }
}
