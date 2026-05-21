import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables. Make sure you are running this from the frontend/ directory.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🚀 Setting up database tables...');

  // 1. Tabela de Depoimentos
  const sqlDepoimentos = `
    CREATE TABLE IF NOT EXISTS public.depoimentos (
      id SERIAL PRIMARY KEY,
      cliente_id UUID REFERENCES auth.users(id),
      nome TEXT NOT NULL,
      comentario TEXT NOT NULL,
      estrelas INTEGER DEFAULT 5,
      aprovado BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Habilitar RLS
    ALTER TABLE public.depoimentos ENABLE ROW LEVEL SECURITY;
    
    -- Políticas
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Depoimentos aprovados são públicos') THEN
        CREATE POLICY "Depoimentos aprovados são públicos" ON public.depoimentos FOR SELECT USING (aprovado = true);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clientes logados podem inserir depoimentos') THEN
        CREATE POLICY "Clientes logados podem inserir depoimentos" ON public.depoimentos FOR INSERT WITH CHECK (auth.uid() = cliente_id);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins podem tudo em depoimentos') THEN
        CREATE POLICY "Admins podem tudo em depoimentos" ON public.depoimentos FOR ALL USING (public.is_admin(auth.uid()));
      END IF;
    END $$;
  `;

  // 2. Colunas Financeiras em Orçamentos
  const sqlFinanceiro = `
    ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS valor_total NUMERIC DEFAULT 0;
    ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE;
  `;

  try {
    console.log('Tentando rodar via RPC exec_sql...');
    
    const { error: error1 } = await supabase.rpc('exec_sql', { query: sqlDepoimentos });
    if (error1) console.error('Erro ao criar depoimentos:', error1.message);
    else console.log('✅ Tabela depoimentos configurada!');

    const { error: error2 } = await supabase.rpc('exec_sql', { query: sqlFinanceiro });
    if (error2) console.error('Erro ao adicionar colunas financeiras:', error2.message);
    else console.log('✅ Colunas financeiras adicionadas!');

  } catch (err) {
    console.error('Falha crítica:', err.message);
  }
}

setupDatabase();
