-- 🚀 MIGRATION: iaNow Payment Standardization
-- Execute este script no SQL Editor do seu Supabase Dashboard.

-- 1. Tabela de Estratégias
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

-- 2. Tabela de Contratos (Jurídico)
ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

-- O sistema já está configurado para ler estas colunas e marcar como 'true' após o pagamento ou simulação.
