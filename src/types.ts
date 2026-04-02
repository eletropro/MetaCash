export type UserRole = 'admin' | 'client';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tenantId?: string; // Only for admins or clients associated with a specific CT
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
  address: string;
  ownerId: string;
  settings: {
    openingTime: string; // HH:mm
    closingTime: string; // HH:mm
    workingDays: number[]; // [0, 1, 2, 3, 4, 5, 6]
  };
}

export interface Court {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  basePrice: number;
  images: string[];
  active: boolean;
}

export interface Booking {
  id: string;
  tenantId: string;
  courtId: string;
  userId: string;
  userName: string;
  startTime: string; // ISO String
  endTime: string; // ISO String
  status: 'pending' | 'confirmed' | 'cancelled' | 'paid';
  totalPrice: number;
  paymentId?: string;
  mercadopagoPaymentId?: string;
  pixCopyPaste?: string;
  pixQrCodeBase64?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  tenantId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  expiryDate: string;
  usageLimit?: number;
  usageCount: number;
}
