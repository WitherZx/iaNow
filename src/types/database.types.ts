// src/types/database.types.ts
// Este arquivo é gerado automaticamente pelo Supabase CLI.
// Para gerar os tipos do seu projeto:
//   npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/types/database.types.ts
//
// O arquivo abaixo é um placeholder para permitir o build.
// Substitua pelo arquivo gerado quando conectar ao projeto Supabase.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          email: string | null
          status: string
          plan_id: string | null
          asaas_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      memberships: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role_id: string
          status: string
          joined_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['memberships']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>
      }
      roles: {
        Row: { id: string; name: string; organization_id: string | null; created_at: string }
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
      }
      strategies: {
        Row: {
          id: string; organization_id: string; diagnostic_id: string | null
          title: string; description: string | null; status: string
          version: number | null; content: Json | null
          created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['strategies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['strategies']['Insert']>
      }
      diagnostics: {
        Row: {
          id: string; organization_id: string; title: string; status: string
          sector: string | null; main_challenges: Json | null; goals: Json | null
          created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['diagnostics']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['diagnostics']['Insert']>
      }
      legal_forms: {
        Row: { id: string; organization_id: string; form_type: string; title: string; status: string; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['legal_forms']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['legal_forms']['Insert']>
      }
      generated_documents: {
        Row: { id: string; organization_id: string; form_id: string | null; title: string; document_type: string; status: string; content: string | null; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['generated_documents']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['generated_documents']['Insert']>
      }
      financial_uploads: {
        Row: { id: string; organization_id: string; file_name: string; file_type: string; file_size_bytes: number | null; status: string; period_start: string | null; period_end: string | null; processed_rows: number | null; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['financial_uploads']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['financial_uploads']['Insert']>
      }
      financial_analysis: {
        Row: { id: string; organization_id: string; upload_id: string | null; summary: Json | null; insights: Json | null; recommendations: Json | null; status: string; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['financial_analysis']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['financial_analysis']['Insert']>
      }
      generated_reports: {
        Row: { id: string; organization_id: string; title: string; status: string; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['generated_reports']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['generated_reports']['Insert']>
      }
      plans: {
        Row: { id: string; name: string; slug: string; price_monthly: number; price_yearly: number | null; features: Json | null; limits: Json | null; is_public: boolean; status: string; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['plans']['Insert']>
      }
      subscriptions: {
        Row: { id: string; organization_id: string; plan_id: string; asaas_subscription_id: string | null; billing_cycle: string; status: string; current_period_start: string | null; current_period_end: string | null; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      invoices: {
        Row: { id: string; organization_id: string; subscription_id: string | null; asaas_charge_id: string | null; amount_due: number; amount_paid: number; status: string; pdf_url: string | null; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      notifications: {
        Row: { id: string; organization_id: string; user_id: string; title: string; body: string; type: string; category: string | null; read_at: string | null; action_url: string | null; channels: Json | null; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      job_queue: {
        Row: { id: string; organization_id: string | null; job_type: string; status: string; payload: Json | null; result: Json | null; error_message: string | null; retries: number | null; priority: number | null; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['job_queue']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['job_queue']['Insert']>
      }
      onboarding_sessions: {
        Row: { id: string; organization_id: string; user_id: string; status: string; current_step: number; total_steps: number; completed_at: string | null; metadata: Json | null; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['onboarding_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['onboarding_sessions']['Insert']>
      }
      onboarding_steps: {
        Row: { id: string; session_id: string; organization_id: string; step_number: number; step_key: string; title: string | null; status: string; completed_at: string | null; metadata: Json | null; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['onboarding_steps']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['onboarding_steps']['Insert']>
      }
      onboarding_answers: {
        Row: { id: string; session_id: string; organization_id: string; step_id: string | null; question_key: string; answer: Json; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['onboarding_answers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['onboarding_answers']['Insert']>
      }
      activity_logs: {
        Row: { id: string; organization_id: string; user_id: string | null; resource_type: string; resource_id: string | null; action: string; description: string | null; ip_address: string | null; user_agent: string | null; metadata: Json | null; created_at: string }
        Insert: Omit<Database['public']['Tables']['activity_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
