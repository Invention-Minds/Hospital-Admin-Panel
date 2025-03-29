import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthServiceService } from './services/auth/auth-service.service'; // Your AuthService to handle logout logic


@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Get the token from localStorage
    const token = localStorage.getItem('token');

    // Clone the request to add the authorization header
    let authReq = req;
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    // Handle the request and catch any errors
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 503) {
          console.warn('⚠️ System is under maintenance. Redirecting...');
          
          // Clear storage to ensure new session after maintenance
          localStorage.clear();
          sessionStorage.clear();

          // Redirect to the maintenance page
          this.router.navigate(['/maintenance']);
        }
        if (error.status === 403) {
          console.warn('403 error encountered. Redirecting to login page...');
          
          // Redirect to the login page
          this.router.navigate(['/login']);

          // Optional: Clear any tokens from local storage
          localStorage.removeItem('token');
        }

        // Pass the error to the caller of the function
        return throwError(() => error);
      })
    );

    // // Pass the cloned request instead of the original request to the next handle
    // return next.handle(authReq);
  }
}



