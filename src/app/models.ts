export interface Client {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
}

export interface Product {
  id?: number;
  name: string;
  price: number;
  quantity?: number; 
}

export interface Invoice {
  id?: number;
  clientId: number;
  date: string; 
  total: number;
}

export interface InvoiceLine {
  id?: number;
  invoiceId: number;
  productId: number;
  qty: number;
  price: number;
}