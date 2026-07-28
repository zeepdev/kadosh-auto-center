-- Script para criar a tabela de Rascunho Online do Fluxo de Caixa no Supabase

CREATE TABLE IF NOT EXISTS public.fluxo_caixa_draft (
  id TEXT PRIMARY KEY DEFAULT 'current_draft',
  data_caixa DATE,
  fundo_caixa_anterior NUMERIC DEFAULT 0,
  dinheiro_empresa_anterior NUMERIC DEFAULT 0,
  fundo_reserva_anterior NUMERIC DEFAULT 0,
  entradas JSONB DEFAULT '[]'::jsonb,
  saidas JSONB DEFAULT '[]'::jsonb,
  fundo_caixa_final NUMERIC DEFAULT 0,
  dinheiro_empresa_final NUMERIC DEFAULT 0,
  fundo_reserva_final NUMERIC DEFAULT 0,
  observacoes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.fluxo_caixa_draft ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em fluxo_caixa_draft" ON public.fluxo_caixa_draft;

CREATE POLICY "Permitir tudo em fluxo_caixa_draft" ON public.fluxo_caixa_draft
  FOR ALL
  USING (true)
  WITH CHECK (true);
