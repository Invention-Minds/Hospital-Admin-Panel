import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-opd-print',
  templateUrl: './opd-print.component.html',
  styleUrl: './opd-print.component.css'
})
export class OpdPrintComponent {
  @Input() data: any; // pass assessment data here
}
