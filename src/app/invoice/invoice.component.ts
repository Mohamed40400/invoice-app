import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { DbService } from '../db.service';
import { CommonModule } from '@angular/common';

interface InvoiceWithDetails {
  invoice: any;
  client: any;
  lines: any[];
}

interface ProductCache {
  [id: number]: string;
}

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Factures</h2>

    <button (click)="onCreateInvoice()" style="margin-bottom: 16px; background: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
      + Créer une facture
    </button>

    @if (invoiceList().length === 0) {
      <p>Aucune facture trouvée.</p>
    }

    @for (item of invoiceList(); track item.invoice.id) {
      <div style="border: 1px solid #ddd; padding: 16px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); background: #fafafa;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <strong>Facture pour: {{ item.client?.name || 'Inconnu' }}</strong><br>
            Date: {{ item.invoice.date }}<br>
            <div style="margin-top: 8px;">
              <span style="font-weight: bold;">HTT:</span> {{ calculateInvoiceSubtotal(item.lines) | number }} MAD<br>
              <span style="font-weight: bold;">TVA (10%):</span> {{ calculateInvoiceTax(item.lines) | number }} MAD<br>
              <span style="font-weight: bold; font-size: 18px;">Total TTC:</span> {{ calculateInvoiceTotal(item.lines) | number }} MAD
            </div>
          </div>
          <div>
            <button (click)="deleteInvoice(item.invoice.id)" style="background: #dc3545; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer;">
              Supprimer
            </button>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
          <thead>
            <tr style="background: #f1f1f1;">
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Produit</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Quantité</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Prix Unit. (MAD)</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">HTT (MAD)</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">TTC (MAD)</th>
            </tr>
          </thead>
          <tbody>
            @for (line of item.lines; track line.id) {
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; border: 1px solid #ddd;">{{ productCache()[line.productId] || 'Inconnu' }}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{{ line.qty }}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{{ line.price | number }}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{{ (line.qty * line.price) | number }}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{{ calculateLineTotalTTC(line.qty, line.price) | number }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (message()) {
      <p [style.color]="message()!.includes('réussi') ? 'green' : 'red'" style="margin-top: 12px; font-weight: bold;">
        {{ message() }}
      </p>
    }
  `,
  styles: []
})
export class InvoiceComponent {
  private db = inject(DbService);
  invoiceList = signal<InvoiceWithDetails[]>([]);
  productCache = signal<ProductCache>({});
  message = signal<string | null>(null);

  @Output() createInvoiceRequested = new EventEmitter<{ invoice?: any; lines?: any[] }>();

  constructor() {
    this.loadProductsAndInvoices();
  }

  async loadProductsAndInvoices() {
    const [products, invoicesWithDetails] = await Promise.all([
      this.db.getProducts(),
      this.db.getInvoicesWithDetails()
    ]);

    const cache: ProductCache = {};
    products.forEach(p => {
      if (p.id !== undefined) {
        cache[p.id] = p.name;
      }
    });
    this.productCache.set(cache);

    this.invoiceList.set(invoicesWithDetails);
  }

  calculateInvoiceSubtotal(lines: any[]): number {
    return lines.reduce((sum, line) => sum + (line.qty * line.price), 0);
  }

  calculateInvoiceTax(lines: any[]): number {
    const subtotal = this.calculateInvoiceSubtotal(lines);
    return subtotal * 0.1;
  }

  calculateInvoiceTotal(lines: any[]): number {
    const subtotal = this.calculateInvoiceSubtotal(lines);
    const tax = this.calculateInvoiceTax(lines);
    return subtotal + tax;
  }

  calculateLineTotalTTC(qty: number, price: number): number {
    const htt = qty * price;
    const tax = htt * 0.1;
    return htt + tax;
  }

  async deleteInvoice(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette facture ? Cela restaurera les quantités des produits.')) {
      try {
        await this.db.deleteInvoice(id);
        this.message.set('Facture supprimée avec succès! Stock restauré.');
        await this.loadProductsAndInvoices();
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        this.message.set('Une erreur s\'est produite lors de la suppression de la facture.');
      }
    }
  }

  onCreateInvoice() {
    this.createInvoiceRequested.emit();
  }
}