import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneMask'
})
export class PhoneMaskPipe implements PipeTransform {
  transform(phoneNumber: string, status: string): string {
    if (!phoneNumber) return ''; // If phone number is empty, return blank

    return status?.toLowerCase() === 'pending'
      ? phoneNumber // Show full phone number if status is "Pending"
      : phoneNumber.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'); // Mask middle 4 digits
  }
}
