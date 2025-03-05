import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Department } from '../../models/department.model';
import { error } from 'console';
import { emit } from 'process';
// import { EventEmitter } from 'stream';

@Component({
  selector: 'app-analytics-filter',
  templateUrl: './analytics-filter.component.html',
  styleUrl: './analytics-filter.component.css'
})
export class AnalyticsFilterComponent implements OnInit {
  constructor(private doctor : DoctorServiceService){}

  department : any
  // selectedDepartment : any
  doctors : any
  departmentValue : any = "All"
  docvalue : any = "All"

  @Output() selectedDepartment = new EventEmitter<any>()
  @Output() selectedDoctor = new EventEmitter<any>()
  @Output() selectedDate = new EventEmitter<any>()


  ngOnInit(){   
    this.loadDepartments()
    // console.log(this.departmentValue, "from filter")
  }

  async loadDepartments():Promise<void>{
    try{
      const data = await this.doctor.getDepartments().toPromise()
      this.department = data;
      // console.log(this.department)
    }catch(err){
      console.error(err)
    }
  }

  departmentONchange(event : any):void{
    this.departmentValue = parseInt(event.target.value);
    // console.log(this.departmentValue, "from filter")
    // this.selectedDepartment.emit(this.departmentValue)
    this.doctor.getDoctors().subscribe(({
      next : (data : any)=> {
        this.doctors = data.filter((doc:any) => doc.departmentId === this.departmentValue)
      },
      error : (error)=>{
        console.error(error)
      },
      complete : ()=>{
        // console.log(this.doctors)
      }
    }))
  }

  doctorOnchange(e : any):void{
    this.departmentValue = parseInt(e.target.value) || 'all';
    this.selectedDoctor.emit(this.departmentValue)
  }

  dateOnChange(e : any):void{
    const date = e.target.value
    const dateParts = date.split("-")
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
    this.selectedDate.emit(date)
    // console.log(date)
  }
}
