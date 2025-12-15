import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DbService } from '../db.service';
import { Product } from '../models';

interface EditableProduct {
  id?: number;
  name: string;
  price: number;
  quantity?: number;
  isEditing: boolean;
}

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <h2>Produits</h2>

    <!-- Formulaire d'ajout d'un nouveau produit -->
    <div style="background: #f8f9fa; padding: 16px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 20px;">
      <h3>Ajouter un nouveau produit</h3>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Nom :</label>
          <input
            type="text"
            [(ngModel)]="nameInput"
            name="name"
            placeholder="Entrez le nom"
            style="width: 100%; max-width: 300px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
          />
        </div>
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Prix (MAD) :</label>
          <input
            type="number"
            [(ngModel)]="priceInput"
            name="price"
            placeholder="Entrez le prix en MAD"
            style="width: 100%; max-width: 300px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
          />
        </div>
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Quantité :</label>
          <input
            type="number"
            [(ngModel)]="quantityInput"
            name="quantity"
            placeholder="Entrez la quantité"
            style="width: 100%; max-width: 300px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
          />
        </div>
        <button
          (click)="addProduct()"
          style="align-self: flex-start; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;"
        >
          + Ajouter le produit
        </button>
      </div>
    </div>

    <!-- Tableau avec édition et suppression -->
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Nom</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Prix (MAD)</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Quantité</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (item of productList(); track item.id) {
            <tr style="border-bottom: 1px solid #eee;">
              @if (item.isEditing) {
                <!-- Mode édition -->
                <td style="padding: 8px;">
                  <input
                    type="text"
                    [(ngModel)]="item.name"
                    style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"
                  />
                </td>
                <td style="padding: 8px;">
                  <input
                    type="number"
                    [(ngModel)]="item.price"
                    style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"
                  />
                </td>
                <td style="padding: 8px;">
                  <input
                    type="number"
                    [(ngModel)]="item.quantity"
                    style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"
                  />
                </td>
                <td style="padding: 8px;">
                  <button (click)="saveProduct(item)" style="padding: 4px 8px; background: #28a745; color: white; border: none; margin-right: 4px; font-size: 12px;">Sauvegarder</button>
                  <button (click)="cancelEdit(item)" style="padding: 4px 8px; background: #6c757d; color: white; border: none; font-size: 12px;">Annuler</button>
                </td>
              } @else {
                <!-- Mode affichage -->
                <td style="padding: 8px;">{{ item.name }}</td>
                <td style="padding: 8px;">{{ item.price | number }} MAD</td>
                <td style="padding: 8px;">{{ item.quantity || 0 }}</td>
                <td style="padding: 8px;">
                  <button (click)="startEdit(item)" style="padding: 4px 8px; background: #ffc107; color: black; border: none; margin-right: 4px; font-size: 12px;">Modifier</button>
                  <button (click)="deleteProduct(item.id!)" style="padding: 4px 8px; background: #dc3545; color: white; border: none; font-size: 12px;">Supprimer</button>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: []
})
export class ProductComponent {
  private db = inject(DbService);
  productList = signal<EditableProduct[]>([]);
  nameInput = '';
  priceInput = 0;
  quantityInput = 0; 

  constructor() {
    this.loadProducts();
  }

  async loadProducts() {
    const products = await this.db.getProducts();
    this.productList.set(
      products.map(product => ({
        ...product,
        price: product.price,
        quantity: product.quantity || 0, 
        isEditing: false
      }))
    );
  }

  async addProduct() {
    if (!this.nameInput.trim() || this.priceInput <= 0) return;

    await this.db.addProduct({
      name: this.nameInput.trim(),
      price: this.priceInput,
      quantity: this.quantityInput 
    });

    await this.loadProducts();
    this.nameInput = '';
    this.priceInput = 0;
    this.quantityInput = 0;
  }

  startEdit(product: EditableProduct) {
    product.isEditing = true;
  }

  cancelEdit(product: EditableProduct) {
    product.isEditing = false;
    this.loadProducts();
  }

  async saveProduct(product: EditableProduct) {
    if (!product.name.trim() || product.price <= 0) return;

    await this.db.updateProduct({
      id: product.id,
      name: product.name.trim(),
      price: product.price,
      quantity: product.quantity
    });

    product.isEditing = false;
    await this.loadProducts();
  }

  async deleteProduct(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      await this.db.deleteProduct(id);
      await this.loadProducts();
    }
  }
}