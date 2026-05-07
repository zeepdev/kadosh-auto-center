-- Script para criar as tabelas de Clientes e Veículos no Supabase

-- 1. Cria a tabela de Clientes (que vai vincular com a autenticação)
CREATE TABLE public.clientes (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  whatsapp TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Segurança)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Política: o próprio cliente pode ver e atualizar seus dados
CREATE POLICY "Clientes podem ver seus próprios dados" ON public.clientes
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Clientes podem atualizar seus próprios dados" ON public.clientes
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Clientes podem inserir seus próprios dados" ON public.clientes
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Cria a tabela de Veículos (Um cliente pode ter vários)
CREATE TABLE public.veiculos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  ano TEXT,
  is_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Segurança)
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

-- Política: o próprio cliente pode ver e gerenciar seus veículos
CREATE POLICY "Clientes gerenciam seus veículos" ON public.veiculos
  FOR ALL USING (auth.uid() = cliente_id);

-- Opcional: Política para o Admin (se for necessário ver todos os clientes depois)
-- Pode ser adicionada usando uma role específica ou verificando o email do admin.
