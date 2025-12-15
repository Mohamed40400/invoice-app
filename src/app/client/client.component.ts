import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DbService } from '../db.service';
import { Client } from '../models';

interface EditableClient {
  id?: number;
  name: string;
  phone?: string;
  isEditing: boolean;
}

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h2>Clients</h2>

    <!-- Form for adding a new client -->
    <div style="background: #f8f9fa; padding: 16px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 20px;">
      <h3>Add New Client</h3>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Name:</label>
          <input
            type="text"
            [(ngModel)]="nameInput"
            name="name"
            placeholder="Enter name"
            style="width: 100%; max-width: 300px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
          />
        </div>
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Phone:</label>
          <input
            type="text"
            [(ngModel)]="phoneInput"
            name="phone"
            placeholder="Enter phone number"
            style="width: 100%; max-width: 300px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
          />
        </div>
        <button
          (click)="addClient()"
          style="align-self: flex-start; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;"
        >
          + Add Client
        </button>
      </div>
    </div>

    <!-- Table with edit and delete actions -->
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Name</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Phone</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (item of clientList(); track item.id) {
            <tr style="border-bottom: 1px solid #eee;">
              @if (item.isEditing) {
                <!-- Edit mode -->
                <td style="padding: 8px;">
                  <input
                    type="text"
                    [(ngModel)]="item.name"
                    style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"
                  />
                </td>
                <td style="padding: 8px;">
                  <input
                    type="text"
                    [(ngModel)]="item.phone"
                    style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"
                  />
                </td>
                <td style="padding: 8px;">
                  <button (click)="saveClient(item)" style="padding: 4px 8px; background: #28a745; color: white; border: none; margin-right: 4px; font-size: 12px;">Save</button>
                  <button (click)="cancelEdit(item)" style="padding: 4px 8px; background: #6c757d; color: white; border: none; font-size: 12px;">Cancel</button>
                </td>
              } @else {
                <!-- Display mode -->
                <td style="padding: 8px;">{{ item.name }}</td>
                <td style="padding: 8px;">{{ item.phone || '—' }}</td>
                <td style="padding: 8px;">
                  <button (click)="startEdit(item)" style="padding: 4px 8px; background: #ffc107; color: black; border: none; margin-right: 4px; font-size: 12px;">Edit</button>
                  <button (click)="deleteClient(item.id!)" style="padding: 4px 8px; background: #dc3545; color: white; border: none; font-size: 12px;">Delete</button>
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
export class ClientComponent {
  private db = inject(DbService);
  clientList = signal<EditableClient[]>([]);
  nameInput = '';
  phoneInput = '';

  constructor() {
    this.loadClients();
  }

  async loadClients() {
    const clients = await this.db.getClients();
   
    this.clientList.set(
      clients.map(client => ({
        ...client,
        phone: client.phone || '',
        isEditing: false
      }))
    );
  }

  async addClient() {
    if (!this.nameInput.trim()) return;

    await this.db.addClient({
      name: this.nameInput.trim(),
      phone: this.phoneInput.trim() || ''
    });

    await this.loadClients();
    this.nameInput = '';
    this.phoneInput = '';
  }

  startEdit(client: EditableClient) {
    client.isEditing = true;
  }

  cancelEdit(client: EditableClient) {
    client.isEditing = false;
    this.loadClients();
  }

  async saveClient(client: EditableClient) {
    if (!client.name.trim()) return;

    await this.db.updateClient({
      id: client.id,
      name: client.name.trim(),
      phone: client.phone?.trim() || ''
    });

    client.isEditing = false;
    await this.loadClients();
  }

  async deleteClient(id: number) {
    if (confirm('Are you sure you want to delete this client?')) {
      await this.db.deleteClient(id);
      await this.loadClients();
    }
  }
}