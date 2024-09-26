import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-total-overview',
  templateUrl: './total-overview.component.html',
  styleUrl: './total-overview.component.css'
})
export class TotalOverviewComponent {
  @Input() iconPath!: string;
  @Input() number!: number;
  @Input() label!: string;
  @Input() backgroundColor!: string;
}
