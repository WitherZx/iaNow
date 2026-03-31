// src/lib/asaas.ts
// Utilitário para comunicação com a API do Asaas v3

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const DEFAULT_TIMEOUT_MS = 15000;

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

type HttpMethod = 'GET' | 'POST' | 'DELETE';

function assertAsaasEnv() {
  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não configurada');
  }
}

async function request<T>(
  endpoint: string,
  method: HttpMethod = 'GET',
  payload?: unknown
): Promise<T> {
  assertAsaasEnv();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
      method,
      headers: {
        access_token: ASAAS_API_KEY as string,
        'Content-Type': 'application/json'
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal
    });

    const data = (await response.json().catch(() => ({}))) as {
      errors?: Array<{ description?: string }>
      message?: string
    }
    if (!response.ok) {
      const message =
        data?.errors?.[0]?.description ||
        data?.message ||
        `Erro na API do Asaas (${response.status})`;
      throw new Error(message);
    }

    return data as T;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo limite excedido ao chamar API do Asaas');
    }
    throw error instanceof Error ? error : new Error('Erro inesperado na API do Asaas');
  } finally {
    clearTimeout(timeout);
  }
}

export const asaas = {
  async get<T = unknown>(endpoint: string): Promise<T> {
    return request<T>(endpoint, 'GET');
  },

  async post<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    return request<T>(endpoint, 'POST', data);
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
    return request(`/subscriptions/${subscriptionId}`, 'DELETE');
  }
};
