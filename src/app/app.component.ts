// src/app/app.component.ts
import { Component } from '@angular/core';
import { ClientComponent } from './client/client.component';
import { ProductComponent } from './product/product.component';
import { InvoiceComponent } from './invoice/invoice.component';
import { CreateInvoiceComponent } from './create-invoice/create-invoice.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ClientComponent, ProductComponent, InvoiceComponent, CreateInvoiceComponent],
  template: `
    <!-- Header -->
    <header style="
      background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
      color: white;
      padding: 20px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    ">
      <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Invoice Management System</h1>
    </header>

    <!-- Navigation -->
    <nav style="
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    ">
      <button 
        (click)="view='client'" 
        [class.active]="view === 'client'"
        style="
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          background: #e9ecef;
          border: none;
          border-radius: 8px;
          transition: all 0.3s ease;
        "
      >
        Clients
      </button>
      <button 
        (click)="view='product'" 
        [class.active]="view === 'product'"
        style="
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          background: #e9ecef;
          border: none;
          border-radius: 8px;
          transition: all 0.3s ease;
        "
      >
        Products
      </button>
      <button 
        (click)="view='invoice'" 
        [class.active]="view === 'invoice'"
        style="
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          background: #e9ecef;
          border: none;
          border-radius: 8px;
          transition: all 0.3s ease;
        "
      >
        Invoices
      </button>
    </nav>

    <!-- Main Content -->
    <main style="padding: 20px; max-width: 1200px; margin: 0 auto;">
      @if (view === 'client') {
        <app-client />
      }
      @if (view === 'product') {
        <app-product />
      }
      @if (view === 'invoice') {
        <app-invoice (createInvoiceRequested)="switchToCreateInvoice()" />
      }
      @if (view === 'create-invoice') {
        <app-create-invoice />
      }
    </main>
  `,
  styles: [`
    button.active {
      background: #007bff !important;
      color: white !important;
      box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
    }
    button:hover:not(.active) {
      background: #dee2e6;
    }
    main {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
  `]
})
export class AppComponent {
  view: 'client' | 'product' | 'invoice' | 'create-invoice' = 'client';

  switchToCreateInvoice() {
    this.view = 'create-invoice';
  }
}