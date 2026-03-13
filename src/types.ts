export interface UserProfile {
  uid: string;
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  contractClauses?: string;
}

export interface Transaction {
  id?: string;
  uid: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  budgetId?: string;
}

export interface Budget {
  id?: string;
  uid: string;
  customerId: string;
  customerName: string;
  title: string;
  items: { description: string; quantity: number; price: number }[];
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  projectAnalysis?: {
    sockets?: number;
    switches?: number;
    dichroics?: number;
    ledPanels?: number;
    ledProfiles?: { meters: number; type: 'embutir' | 'sobrepor' }[];
    otherDetails?: string;
    suggestedValue?: number;
    calculationBasis?: string;
  };
  contractDetails?: {
    deadline: string;
    paymentTerms: string;
    warranty: string;
    customClauses: string;
  };
  contractText?: string;
  fileUrl?: string;
}

export interface Customer {
  id?: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  address?: string;
  notes: string;
  lastInteraction: string;
}

export interface Loan {
  id?: string;
  uid: string;
  borrowerName: string;
  principal: number;
  interestRate: number;
  type: 'interest_only' | 'principal_interest';
  startDate: string;
  status: 'active' | 'paid';
}
