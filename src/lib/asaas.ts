// src/lib/asaas.ts
// Utilitário para comunicação com a API do Asaas v3

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

interface AsaasCustomerData {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
  address?: string;
  externalReference?: string;
}

interface AsaasSubscriptionData {
  customer: string;
  billingType: 'CREDIT_CARD' | 'BOLETO' | 'PIX' | 'UNDEFINED';
  nextDueDate: string;
  value: number;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'ANNUALLY';
  description: string;
  externalReference?: string;
}

export const asaas = {
  async get(endpoint: string) {
    const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
      headers: {
        'access_token': ASAAS_API_KEY || '',
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  async post(endpoint: string, data: any) {
    const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'access_token': ASAAS_API_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.description || 'Erro na API do Asaas');
    }

    return response.json();
  },

  async createCustomer(data: AsaasCustomerData) {
    return this.post('/customers', data);
  },

  async createSubscription(data: AsaasSubscriptionData) {
    return this.post('/subscriptions', data);
  },

  async getSubscriptionPayments(subscriptionId: string) {
    return this.get(`/subscriptions/${subscriptionId}/payments`);
  },

  async deleteSubscription(subscriptionId: string) {
    const response = await fetch(`${ASAAS_API_URL}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'access_token': ASAAS_API_KEY || '',
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }
};
