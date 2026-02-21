
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  reference?: string;
  colors?: string[];
  sizes?: string[];
  imageUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  cpf: string;
  phone?: string;
}

export enum PaymentMethod {
  CASH = 'CASH',
  INSTALLMENTS = 'INSTALLMENTS',
  PIX = 'PIX'
}

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ARRIVED = 'ARRIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  productReference?: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  date: string;
  arrivalDate?: string;
}

export interface Installment {
  id: string;
  saleId: string;
  number: number;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  products: { productId: string; quantity: number; unitPrice: number }[];
  totalOriginal: number;
  totalDiscounted: number;
  discountPercentage: number;
  paymentMethod: PaymentMethod;
  installmentsCount: number;
  date: string;
}

export interface StoreState {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  installments: Installment[];
  orders: Order[];
}
