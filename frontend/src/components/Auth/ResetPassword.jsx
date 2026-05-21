import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { translateError } from '../../lib/errorTranslations';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  // Verifica se o usuário tem uma sessão válida (o Supabase cria uma sessão temporária ao clicar no link do e-mail)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setMessage('❌ Link inválido ou expirado. Por favor, solicite a recuperação de senha novamente.');
        setStatus('error');
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ password: senha });

      if (error) throw new Error(error.message);

      setStatus('success');
      setMessage('✅ Senha alterada com sucesso! Redirecionando...');
      
      setTimeout(() => {
        navigate('/cliente');
      }, 2000);

    } catch (error) {
      console.error(error);
      setMessage(`❌ ${translateError(error.message)}`);
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0505', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
      <form onSubmit={handleSubmit} className="glass" style={{ padding: '40px', maxWidth: '400px', width: '100%', borderRadius: '12px' }}>
        <h2 style={{ color: '#dc2743', marginBottom: '10px', textAlign: 'center' }}>Criar Nova Senha</h2>
        <p style={{ color: '#aaa', marginBottom: '30px', textAlign: 'center' }}>Digite sua nova senha abaixo.</p>
        
        {status === 'error' && !senha && (
          <div style={{ color: '#f87171', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
            {message}
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>Nova Senha</label>
          <input 
            type="password" 
            required 
            value={senha} 
            onChange={e => setSenha(e.target.value)} 
            disabled={status === 'success' || (status === 'error' && !senha)} 
            minLength="6"
          />
        </div>

        {message && status !== 'error' && (
          <div style={{ color: status === 'success' ? '#4ade80' : '#f87171', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
            {message}
          </div>
        )}
        
        <button 
          type="submit" 
          className="btn" 
          style={{ width: '100%' }} 
          disabled={status === 'loading' || status === 'success' || (status === 'error' && !senha)}
        >
          {status === 'loading' ? 'Salvando...' : 'Salvar Nova Senha'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
