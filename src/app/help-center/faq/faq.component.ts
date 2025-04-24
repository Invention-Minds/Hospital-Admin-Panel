import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.css']
})
export class FAQComponent {
module: any;
activeQuestion: any;
toggleQuestion(arg0: any) {
throw new Error('Method not implemented.');
}
  activeIndex: number | null = null;

  ngOnInit(){
   this.activeQuestion, "faq component"  
  }    

  toggleAnswer(index: number): void {
    this.activeIndex = this.activeIndex === index ? null : index;
  }

  @Input() FAQDetails: any[] =[];
  @Output() questionSelected = new EventEmitter<any>();

  isExpanded = false;

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  selectQuestion(faq: any) {
    this.questionSelected.emit(faq);
  }

 
}