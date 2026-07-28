import { supabase } from '../lib/supabase';

/**
 * Registrar um log no Supabase (com fallback seguro em console se a tabela ainda não existir)
 */
export const registrarLog = async ({ acao, modulo, detalhes, usuario = 'Administrador', metadata = {} }) => {
  try {
    const { error } = await supabase
      .from('logs_sistema')
      .insert([{
        usuario,
        acao,
        modulo,
        detalhes,
        metadata
      }]);

    if (error) {
      console.warn('⚠️ Log local registado (tabela logs_sistema pendente no Supabase):', { acao, modulo, detalhes });
    }
  } catch (err) {
    console.warn('⚠️ Erro ao gravar log no Supabase:', err);
  }
};

/**
 * Buscar histórico de logs de sistema
 */
export const fetchLogs = async (limit = 100) => {
  try {
    const { data, error } = await supabase
      .from('logs_sistema')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Erro ao carregar logs:', err.message);
    return [];
  }
};
