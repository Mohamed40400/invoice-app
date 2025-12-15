import { Component, inject, signal } from '@angular/core';
import { DbService } from '../db.service';
import { Client, Product, InvoiceLine } from '../models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Créer une nouvelle facture</h2>

    <div style="margin: 16px 0;">
      <label>Choisir le client:</label><br>
      <select #clientSelect style="padding: 6px; width: 200px;">
        <option value="">-- Choisir un client --</option>
        @for (client of clients(); track client.id) {
          <option [value]="client.id">{{ client.name }}</option>
        }
      </select>
    </div>

    <div style="margin: 16px 0; padding: 12px; border: 1px solid #ddd; border-radius: 6px;">
      <h3>Ajouter un produit</h3>
      <div style="margin: 8px 0;">
        <label>Produit:</label><br>
        <select #productSelect style="padding: 6px; width: 250px;">
          <option value="">-- Choisir un produit --</option>
          @for (product of products(); track product.id) {
            @if (product.id !== undefined) {
              <option [value]="product.id" [attr.data-price]="product.price">
                {{ product.name }} ({{ product.price | number }} MAD) - Stock: {{ getAvailableQuantity(product.id) }}
              </option>
            }
          }
        </select>
      </div>
      <div style="margin: 8px 0;">
        <label>Quantité:</label><br>
        <input type="number" #qtyInput [value]="1" min="1" style="padding: 6px; width: 100px;" />
      </div>
      <button 
        (click)="addItem(clientSelect, productSelect, qtyInput)" 
        style="margin-top: 10px; padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        + Ajouter à la facture
      </button>
    </div>

    @if (invoiceLines().length > 0) {
      <h3>Éléments de la facture ({{ invoiceLines().length }})</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <thead>
          <tr style="background: #f1f1f1;">
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Produit</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Quantité</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Prix Unit. (MAD)</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">HTT (MAD)</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">TTC (MAD)</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (line of invoiceLines(); track line.productId + line.qty) {
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; border: 1px solid #ddd;">{{ getProductName(line.productId) }}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{ line.qty }}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{ line.price | number }}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{ (line.qty * line.price) | number }}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{ calculateLineTotalTTC(line.qty, line.price) | number }}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">
                <button (click)="removeItem(line)" style="background: #dc3545; color: white; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer;">
                  Supprimer
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <div style="margin-top: 16px; font-weight: bold; font-size: 18px;">
        <p>Total HTT: {{ totalAmount() | number }} MAD</p>
        <p>TVA (10%): {{ calculateTax() | number }} MAD</p>
        <p>Total TTC: {{ calculateTotalWithTax() | number }} MAD</p>
      </div>

      <button 
        (click)="saveInvoice(clientSelect)" 
        style="margin-top: 16px; background: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
        Enregistrer la facture
      </button>
    }

    @if (message()) {
      <p [style.color]="message()!.includes('réussi') ? 'green' : 'red'" 
         style="margin-top: 12px; font-weight: bold;">
        {{ message() }}
      </p>
    }
  `,
  styles: []
})
export class CreateInvoiceComponent {
  private db = inject(DbService);
  clients = signal<Client[]>([]);
  products = signal<Product[]>([]);
  invoiceLines = signal<InvoiceLine[]>([]);
  message = signal<string | null>(null);

  constructor() {
    this.loadClientsAndProducts();
  }

  async loadClientsAndProducts() {
    const [clients, products] = await Promise.all([
      this.db.getClients(),
      this.db.getProducts()
    ]);
    this.clients.set(clients);
    this.products.set(products);
  }

  getProductName(productId: number): string {
    const product = this.products().find(p => p.id === productId);
    return product ? product.name : 'Inconnu';
  }

  getAvailableQuantity(productId: number | undefined): number {
    if (productId === undefined) return 0;
    const product = this.products().find(p => p.id === productId);
    if (!product) return 0;
    const totalQtyInInvoice = this.invoiceLines()
      .filter(line => line.productId === productId)
      .reduce((sum, line) => sum + line.qty, 0);
    return (product.quantity || 0) - totalQtyInInvoice;
  }

  totalAmount(): number {
    return this.invoiceLines().reduce((sum, line) => sum + line.qty * line.price, 0);
  }

  calculateTax(): number {
    return this.totalAmount() * 0.1;
  }

  calculateTotalWithTax(): number {
    return this.totalAmount() + this.calculateTax();
  }

  calculateLineTotalTTC(qty: number, price: number): number {
    const htt = qty * price;
    const tax = htt * 0.1;
    return htt + tax;
  }

  removeItem(lineToRemove: InvoiceLine) {
    this.invoiceLines.update(lines => lines.filter(line => line.productId !== lineToRemove.productId || line.qty !== lineToRemove.qty));
    this.message.set(null);
  }

  addItem(
    clientSelect: HTMLSelectElement,
    productSelect: HTMLSelectElement,
    qtyInput: HTMLInputElement
  ) {
    const clientId = clientSelect.value;
    const productIdStr = productSelect.value;
    const qty = parseInt(qtyInput.value) || 1;

    if (!clientId) {
      this.message.set('Veuillez choisir un client d\'abord');
      return;
    }
    if (!productIdStr) {
      this.message.set('Veuillez choisir un produit');
      return;
    }

    const productId = +productIdStr;
    const price = parseFloat(productSelect.selectedOptions[0]?.dataset['price'] || '0');
    if (price <= 0) {
      this.message.set('Prix du produit invalide');
      return;
    }

    const availableQty = this.getAvailableQuantity(productId);
    if (availableQty < qty) {
      this.message.set(`Stock insuffisant pour ${this.getProductName(productId)}. Stock disponible: ${availableQty}`);
      return;
    }

    const newLine: InvoiceLine = { productId, qty, price, invoiceId: 0 };
    this.invoiceLines.update(lines => [...lines, newLine]);
    this.message.set(null);
    this.loadClientsAndProducts();
    productSelect.value = '';
    qtyInput.value = '1';
  }

  async saveInvoice(clientSelect: HTMLSelectElement) {
    const clientId = parseInt(clientSelect.value, 10);
    if (!clientId) {
      this.message.set('Aucun client sélectionné');
      return;
    }
    if (this.invoiceLines().length === 0) {
      this.message.set('Aucun élément dans la facture');
      return;
    }

    const total = this.calculateTotalWithTax();
    const invoice = { clientId, date: new Date().toISOString().split('T')[0], total };
    try {
      await this.db.addInvoice(invoice, this.invoiceLines());
      this.message.set('Facture enregistrée avec succès! Stock mis à jour.');
      this.invoiceLines.set([]);
      await this.loadClientsAndProducts();
    } catch (err) {
      this.message.set('Une erreur s\'est produite lors de l\'enregistrement de la facture.');
    }
  }
}