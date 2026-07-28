-- Script para criar a tabela de Logs de Sistema no Supabase

CREATE TABLE IF NOT EXISTS public.logs_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario TEXT DEFAULT 'Administrador',
  acao TEXT NOT NULL, -- 'CRIACAO', 'EDICAO', 'EXCLUSAO', 'PAGAMENTO', 'STATUS_ALTERADO'
  modulo TEXT NOT NULL, -- 'Orçamentos', 'Mecanicos', 'Fluxo de Caixa'
  detalhes TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.logs_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em logs_sistema" ON public.logs_sistema;

CREATE POLICY "Permitir tudo em logs_sistema" ON public.logs_sistema
  FOR ALL
  USING (true)
  WITH CHECK (true);
