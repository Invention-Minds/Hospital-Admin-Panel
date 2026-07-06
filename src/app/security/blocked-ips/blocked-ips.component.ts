import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService, IpBlock } from '../../services/security.service';

/**
 * Super-admin screen: list rate-limit-blocked IPs and unblock them.
 * Route: /security/blocked-ips (authGuard + roleGuard, super_admin only).
 */
@Component({
  selector: 'app-blocked-ips',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blocked-ips.component.html',
  styleUrl: './blocked-ips.component.css',
})
export class BlockedIpsComponent implements OnInit {
  blocks: IpBlock[] = [];
  search = '';
  loading = false;
  message = '';
  error = '';

  /** Client-side text filter over the loaded blocks (ip/reason). */
  get displayed(): IpBlock[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.blocks;
    return this.blocks.filter((b) => b.ip.toLowerCase().includes(q) || (b.reason || '').toLowerCase().includes(q));
  }

  // Manual block form
  newIp = '';
  newReason = '';
  newMinutes: number | null = 15;

  constructor(private security: SecurityService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.error = '';
    this.security.listBlocks(true).subscribe({
      next: (res) => {
        this.blocks = res.blocks;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to load blocked IPs';
        this.loading = false;
      },
    });
  }

  unblock(block: IpBlock): void {
    if (typeof window !== 'undefined' && !window.confirm(`Unblock ${block.ip}?`)) return;
    this.security.unblock(block.ip).subscribe({
      next: () => {
        this.message = `Unblocked ${block.ip}`;
        this.refresh();
      },
      error: (err) => (this.error = err?.error?.error || 'Failed to unblock'),
    });
  }

  blockIp(): void {
    const ip = this.newIp.trim();
    if (!ip) {
      this.error = 'Enter an IP to block';
      return;
    }
    this.security.block(ip, this.newReason.trim() || undefined, this.newMinutes).subscribe({
      next: () => {
        this.message = `Blocked ${ip}`;
        this.newIp = '';
        this.newReason = '';
        this.refresh();
      },
      error: (err) => (this.error = err?.error?.error || 'Failed to block'),
    });
  }
}
