import { Injectable } from '@angular/core';
import Dexie, { Transaction } from 'dexie';
import { Client, Product, Invoice, InvoiceLine } from './models';

export class AppDB extends Dexie {
  clients!: Dexie.Table<Client, number>;
  products!: Dexie.Table<Product, number>;
  invoices!: Dexie.Table<Invoice, number>;
  invoiceLines!: Dexie.Table<InvoiceLine, number>;

  constructor() {
    super('InvoiceAppDB');

    this.version(3).stores({
      clients: '++id,name,phone,email',
      products: '++id,name,price,quantity',
      invoices: '++id,clientId,date,total',
      invoiceLines: '++id,invoiceId,productId,qty,price'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private db = new AppDB();


  private cachedClients: Client[] | null = null;
  private cachedProducts: Product[] | null = null; 
  private cachedInvoicesWithDetails: any[] | null = null;

  constructor() {
    this.db.open()
      .then(() => {
        console.log('Dexie DB opened successfully.');

        this.db.transaction('rw', this.db.clients, this.db.products, async (tx) => {
          const clientCount = await tx.table('clients').count();
          if (clientCount === 0) {
            await tx.table('clients').bulkAdd([
              { name: 'Ahmed Ali', phone: '0501112233' },
              { name: 'Leila Salem', phone: '0554445566' }
            ]);
            await tx.table('products').bulkAdd([
              { name: 'Laptop', price: 3000, quantity: 5 },
              { name: 'Souris sans fil', price: 80, quantity: 20 },
              { name: 'Écran 24"', price: 1200, quantity: 10 }
            ]);
            console.log('Données initiales ajoutées.');
          }
        });
      })
      .catch(err => {
        console.error('Failed to open Dexie DB:', err);
      });
  }


  getClients() {
    if (this.cachedClients !== null) {
      console.log('Clients from cache');
      return Promise.resolve(this.cachedClients);
    }
    console.log('Clients from DB');
    return this.db.clients.toArray().then(clients => {
      this.cachedClients = clients;
      return clients;
    });
  }

  addClient(client: Client) {
    return this.db.clients.add(client).then(id => {
      this.cachedClients = null; 
      return id;
    });
  }

  updateClient(client: Client) {
    return this.db.clients.put(client).then(() => {
      this.cachedClients = null;
    });
  }

  deleteClient(id: number) {
    return this.db.clients.delete(id).then(() => {
      this.cachedClients = null; 
    });
  }


  getProducts() {
    if (this.cachedProducts !== null) {
      console.log('Products from cache'); 
      return Promise.resolve(this.cachedProducts);
    }
    console.log('Products from DB');
    return this.db.products.toArray().then(products => {
      this.cachedProducts = products;
      return products;
    });
  }

  addProduct(product: Product) {
    return this.db.products.add(product).then(id => {
      this.cachedProducts = null;
      return id;
    });
  }

  updateProduct(product: Product) {
    return this.db.products.put(product).then(() => {
      this.cachedProducts = null; 
    });
  }

  deleteProduct(id: number) {
    return this.db.products.delete(id).then(() => {
      this.cachedProducts = null; 
    });
  }

  async addInvoice(invoice: Invoice, lines: InvoiceLine[]) {
    try {
      const id = await this.db.transaction('rw', this.db.invoices, this.db.invoiceLines, this.db.products, async (tx: Transaction) => {
        console.log('Transaction commencée pour ajouter la facture.');
        const invoiceId = await this.db.invoices.add(invoice);
        console.log('Facture ajoutée avec ID:', invoiceId);

        for (const line of lines) {
          line.invoiceId = invoiceId;
          await this.db.invoiceLines.add(line);
          console.log('Ligne ajoutée à la facture:', line);
        }

        await this.updateProductQuantitiesAfterInvoice(lines, tx);
        console.log('Quantités mises à jour.');
        console.log('Transaction terminée avec succès.');
        return invoiceId;
      });
      console.log('Facture ajoutée avec succès, ID:', id);
      this.cachedInvoicesWithDetails = null;
      this.cachedProducts = null;
      return id;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la facture:', error);
      throw error;
    }
  }


  async updateInvoice(invoice: Invoice, oldLines: InvoiceLine[], newLines: InvoiceLine[]) {
    return this.db.transaction('rw', this.db.invoices, this.db.invoiceLines, this.db.products, async (tx: Transaction) => {
      console.log('Transaction commencée pour modifier la facture.');
      console.log('Anciennes lignes:', oldLines);
      console.log('Nouvelles lignes:', newLines);

      
      await tx.table('invoices').put(invoice);
      console.log('Facture mise à jour.');

      const oldInvoiceIds = oldLines.map(l => l.id).filter(id => id !== undefined) as number[];
      if (oldInvoiceIds.length > 0) {
        await tx.table('invoiceLines').bulkDelete(oldInvoiceIds);
        console.log('Anciennes lignes supprimées.');
      }

      for (const line of newLines) {
        line.invoiceId = invoice.id!;
        await tx.table('invoiceLines').add(line);
        console.log('Nouvelle ligne ajoutée:', line);
      }


      await this.restoreProductQuantitiesAfterInvoiceDeletion(oldLines, tx);
      console.log('Quantités restaurées pour les anciennes lignes.');

      await this.updateProductQuantitiesAfterInvoice(newLines, tx);
      console.log('Quantités mises à jour pour les nouvelles lignes.');

      console.log('Transaction de modification terminée avec succès.');
    }).then(() => {
  
      this.cachedInvoicesWithDetails = null;
      this.cachedProducts = null;
    });
  }

  getInvoices() {
    return this.db.invoices.toArray();
  }


  async getInvoicesWithDetails() {
    if (this.cachedInvoicesWithDetails !== null) {
      console.log('Invoices from cache');
      return this.cachedInvoicesWithDetails;
    }
    console.log('Invoices from DB');

   
    const invoices = await this.db.invoices.toArray();
    const clients = await this.db.clients.toArray();
    const allInvoiceLines = await this.db.invoiceLines.toArray(); 


    const clientMap = new Map(clients.map(c => [c.id!, c]));
    const linesMap = new Map<number, InvoiceLine[]>();


    for (const line of allInvoiceLines) {
      const invoiceId = line.invoiceId;
      if (!linesMap.has(invoiceId)) {
        linesMap.set(invoiceId, []);
      }
      linesMap.get(invoiceId)!.push(line);
    }


    const result = invoices.map(inv => ({
      invoice: inv,
      client: clientMap.get(inv.clientId) || null,
      lines: linesMap.get(inv.id!) || [] 
    }));

    this.cachedInvoicesWithDetails = result;
    return result;
  }

  async deleteInvoice(id: number) {
    try {
      await this.db.transaction('rw', this.db.invoices, this.db.invoiceLines, this.db.products, async (tx: Transaction) => {
        console.log('Transaction commencée pour supprimer la facture.');
        const lines = await this.db.invoiceLines.where('invoiceId').equals(id).toArray();
        console.log('Lignes à supprimer:', lines);

        await this.db.invoices.delete(id);
        console.log('Facture supprimée.');

        await this.db.invoiceLines.where('invoiceId').equals(id).delete();
        console.log('Lignes de facture supprimées.');

        await this.restoreProductQuantitiesAfterInvoiceDeletion(lines, tx);
        console.log('Quantités restaurées.');
        console.log('Transaction de suppression terminée avec succès.');
      });
      console.log('Facture supprimée avec succès, ID:', id);
      this.cachedInvoicesWithDetails = null;
      this.cachedProducts = null;
    } catch (error) {
      console.error('Erreur lors de la suppression de la facture:', error);
      throw error;
    }
  }

  private async updateProductQuantitiesAfterInvoice(lines: InvoiceLine[], tx: Transaction) {
    for (const line of lines) {
      const product = await tx.table('products').get(line.productId);
      if (product) {
        const newQuantity = Math.max(0, (product.quantity || 0) - line.qty);
        await tx.table('products').update(line.productId, { quantity: newQuantity });
        console.log(`Quantité mise à jour pour produit ${line.productId}, nouvelle quantité: ${newQuantity}`);
      } else {
        console.warn(`Produit introuvable pour la mise à jour de la quantité: ${line.productId}`);
      }
    }
  }

  private async restoreProductQuantitiesAfterInvoiceDeletion(lines: InvoiceLine[], tx: Transaction) {
    for (const line of lines) {
      const product = await tx.table('products').get(line.productId);
      if (product) {
        const newQuantity = (product.quantity || 0) + line.qty;
        await tx.table('products').update(line.productId, { quantity: newQuantity });
        console.log(`Quantité restaurée pour produit ${line.productId}, nouvelle quantité: ${newQuantity}`);
      } else {
        console.warn(`Produit introuvable pour restaurer la quantité: ${line.productId}`);
      }
    }
  }
}