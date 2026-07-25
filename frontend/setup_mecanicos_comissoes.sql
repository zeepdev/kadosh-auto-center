-- Script para criar a tabela de Mecânicos e estender Orçamentos com Comissões e Pagamentos no Supabase

-- 1. Tabela de Mecânicos
CREATE TABLE IF NOT EXISTS public.mecanicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  cpf_pix TEXT,
  especialidade TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS na tabela de mecânicos
ALTER TABLE public.mecanicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo para usuários autenticados em mecanicos" ON public.mecanicos
  FOR ALL TO authenticated USING (true);

-- 2. Novas colunas na tabela de Orçamentos
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS mecanico_id UUID REFERENCES public.mecanicos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mecanico_nome TEXT,
  ADD COLUMN IF NOT EXISTS valor_pecas NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_mao_obra NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_tipo TEXT DEFAULT 'porcentagem',
  ADD COLUMN IF NOT EXISTS comissao_taxa NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_comissao NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_pagamento DATE,
  ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS conta_destino TEXT;
