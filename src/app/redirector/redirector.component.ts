import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-redirector',
  templateUrl: './redirector.component.html',
  styleUrl: './redirector.component.css'
})
export class RedirectorComponent {
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const target = this.route.snapshot.queryParamMap.get('target');
    if (target) {
      this.router.navigateByUrl('/' + target);
    } else {
      this.router.navigateByUrl('/');
    }
  }
}
