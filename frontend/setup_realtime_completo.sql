-- Script para Habilitar Transmissão em Tempo Real (Realtime sem F5) no Supabase

-- Adicionar tabelas à publicação realtime do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.orcamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fluxo_caixa;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fluxo_caixa_draft;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs_sistema;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mecanicos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.depoimentos;
