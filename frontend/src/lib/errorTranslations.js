export const translateError = (errorMsg) => {
  if (!errorMsg) return "Ocorreu um erro desconhecido. Tente novamente.";

  const msg = errorMsg.toLowerCase();

  // Erros de Autenticação (Supabase Auth)
  if (msg.includes('user already registered')) {
    return 'Este e-mail já está cadastrado. Tente fazer login em vez de criar uma conta.';
  }
  if (msg.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Acesse sua caixa de entrada e clique no link de confirmação.';
  }
  if (msg.includes('password should be at least 6 characters')) {
    return 'Sua senha é muito curta. Ela deve ter pelo menos 6 caracteres.';
  }
  if (msg.includes('user not found')) {
    return 'Não encontramos nenhuma conta com este e-mail.';
  }
  if (msg.includes('new password should be different from the old password')) {
    return 'A nova senha deve ser diferente da sua senha atual.';
  }
  if (msg.includes('token has expired or is invalid')) {
    return 'O link de confirmação ou de redefinição de senha expirou. Solicite um novo.';
  }

  // Erros de Banco de Dados (PostgreSQL Constraints)
  if (msg.includes('duplicate key value violates unique constraint')) {
    if (msg.includes('clientes_cpf_key') || msg.includes('cpf')) {
      return 'Este CPF já está cadastrado no sistema. Se você esqueceu sua senha, use a opção "Esqueci minha senha".';
    }
    if (msg.includes('clientes_whatsapp_key') || msg.includes('whatsapp')) {
      return 'Este número de WhatsApp já está cadastrado em outra conta.';
    }
    if (msg.includes('veiculos_placa_key') || msg.includes('placa')) {
      return 'Esta placa já está cadastrada no sistema sob outro cliente.';
    }
    return 'Já existe um registro com esses mesmos dados exclusivos no sistema.';
  }

  if (msg.includes('new row violates row-level security policy')) {
    return 'Sua sessão expirou ou você não tem permissão para realizar esta ação. Tente fazer login novamente.';
  }

  // Erros Genéricos
  if (msg.includes('network request failed') || msg.includes('failed to fetch')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  // Se não encontrar mapeamento, retorna um erro amigável com o detalhe técnico escondido ou limpo
  return `Ocorreu um erro inesperado: ${errorMsg}`;
};
