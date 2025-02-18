import { Component } from '@angular/core';
// import { estimation_data } from '../data';

@Component({
  selector: 'app-extimation',
  templateUrl: './extimation.component.html',
  styleUrl: './extimation.component.css'
})
export class ExtimationComponent {
  barchart : any
  // approved = estimation_data.map((data:any) => data.esti_approved)
  // request = estimation_data.map((data:any) => data.esti_req)
  // confirm = estimation_data.map((data:any) => data.esti_confirm)
  // complete = estimation_data.map((data:any) => data.esti_completed)
  ngOnInit(){
    this.loadChart()
  }

  loadChart():void{
    this.barchart = {
      xAxis: {
        type: 'category',
        data: ['esti_req','esti_approved','esti_confirm','esti_completed']
      },
      tooltip: {
        trigger: 'axis',  // Shows tooltip when hovering over bars
        axisPointer: {
          type: 'shadow'  // Highlights the hovered bar
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          data: [300, 280, 150, 100],
          type: 'bar',
          showBackground: true,
          backgroundStyle: {
            color: 'rgba(180, 180, 180, 0.2)'
          }
        }
      ]
    };
  }
}
