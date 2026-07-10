-- Script para criar a tabela de Fluxo de Caixa no Supabase
-- Execute este script no painel SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.fluxo_caixa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  caixa_inicial NUMERIC NOT NULL DEFAULT 0,
  fundo_caixa NUMERIC NOT NULL DEFAULT 0,
  dinheiro_empresa NUMERIC NOT NULL DEFAULT 0,
  fundo_reserva NUMERIC NOT NULL DEFAULT 0,
  entradas JSONB NOT NULL DEFAULT '[]'::jsonb,
  saidas JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.fluxo_caixa ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso simplificada para usuários autenticados (administradores)
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.fluxo_caixa
  FOR ALL TO authenticated USING (true);
