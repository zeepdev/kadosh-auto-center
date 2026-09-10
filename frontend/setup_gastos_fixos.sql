-- ==============================================================================
-- SCRIPT DE CRIAÇÃO E CONFIGURAÇÃO DA TABELA: gastos_fixos
-- OFICINA MECÂNICA KADOSH
--
-- Instruções:
-- 1. Acesse o Supabase (https://supabase.com/dashboard)
-- 2. Selecione seu projeto Kadosh
-- 3. Abra o menu "SQL Editor" na barra lateral esquerda
-- 4. Cole todo este código e clique em "RUN"
-- ==============================================================================

-- 1. Criação da Tabela de Gastos Fixos & Recorrentes
CREATE TABLE IF NOT EXISTS public.gastos_fixos (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES public.gastos_fixos(id) ON DELETE CASCADE,
  is_parent BOOLEAN DEFAULT false,
  parcela_numero INTEGER,
  total_parcelas INTEGER,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  valor_pago_real NUMERIC,
  data_vencimento DATE NOT NULL,
  data_final DATE,
  recorrencia TEXT DEFAULT 'mensal',
  status TEXT DEFAULT 'em_aberto',
  data_pagamento DATE,
  metodo_pagamento TEXT,
  conta_destino TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Índices para Alta Performance de Busca e Agrupamento
CREATE INDEX IF NOT EXISTS idx_gastos_fixos_parent_id ON public.gastos_fixos(parent_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fixos_data_vencimento ON public.gastos_fixos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_gastos_fixos_status ON public.gastos_fixos(status);
CREATE INDEX IF NOT EXISTS idx_gastos_fixos_categoria ON public.gastos_fixos(categoria);

-- 3. Habilitação de Segurança de Nível de Linha (RLS)
ALTER TABLE public.gastos_fixos ENABLE ROW LEVEL SECURITY;

-- 4. Política de Permissão Total para o Sistema da Oficina
DROP POLICY IF EXISTS "Permitir tudo em gastos_fixos" ON public.gastos_fixos;
CREATE POLICY "Permitir tudo em gastos_fixos" ON public.gastos_fixos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Adicionar a tabela à Publicação Realtime do Supabase (Atualização instantânea sem F5)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gastos_fixos;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Já está na publicação
END $$;
