import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { translateError } from '../../lib/errorTranslations';

const CompleteRegistration = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  // Verifica se o usuário realmente precisa completar o cadastro
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate('/login');
      } else if (!data.user.email?.endsWith('@kadosh.temp')) {
        navigate('/cliente');
      }
    });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (senha.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (senha !== confirmSenha) {
      setErrorMessage('As senhas não conferem.');
      return;
    }

    setStatus('loading');

    try {
      const { error } = await supabase.auth.updateUser({
        email: email,
        password: senha
      });

      if (error) throw error;

      setStatus('success');
      setTimeout(() => {
        navigate('/cliente');
      }, 1500);

    } catch (error) {
      console.error(error);
      setErrorMessage(translateError(error.message));
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
      <form onSubmit={handleSubmit} className="glass" style={{ padding: '40px', maxWidth: '500px', width: '100%', borderRadius: '12px', border: '1px solid #e10600' }}>
        <h2 style={{ color: '#e10600', marginBottom: '10px', textAlign: 'center' }}>Complete seu Cadastro</h2>
        <p style={{ color: '#aaa', marginBottom: '30px', textAlign: 'center', lineHeight: '1.5' }}>
          Bem-vindo! Para garantir a segurança da sua conta e acompanhar seus serviços, por favor informe o seu <strong>E-mail real</strong> e crie uma <strong>Nova Senha</strong>.
        </p>
        
        <div className="form-group">
          <label>E-mail Real</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu.email@exemplo.com" />
        </div>
        
        <div className="form-group">
          <label>Nova Senha</label>
          <input type="password" required value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" minLength="6" />
        </div>

        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label>Confirmar Nova Senha</label>
          <input type="password" required value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} placeholder="Repita a senha" minLength="6" />
        </div>

        {errorMessage && <div style={{ color: '#f87171', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>⚠️ {errorMessage}</div>}
        {status === 'success' && <div style={{ color: '#4ade80', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>✅ Atualizado com sucesso! Entrando...</div>}
        
        <button type="submit" className="btn" style={{ width: '100%' }} disabled={status === 'loading' || status === 'success'}>
          {status === 'loading' ? 'Salvando...' : 'Salvar e Entrar'}
        </button>
      </form>
    </div>
  );
};

export default CompleteRegistration;
