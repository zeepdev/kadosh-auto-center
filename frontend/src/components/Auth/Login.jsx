import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { translateError } from '../../lib/errorTranslations';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Se já existe sessão ativa, redireciona direto pra área do cliente
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate('/cliente');
    });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha
      });

      if (error) throw new Error(error.message);

      setStatus('success');
      setTimeout(() => {
        navigate('/cliente');
      }, 1000);

    } catch (error) {
      console.error(error);
      setErrorMessage(translateError(error.message));
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0505', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
      <form onSubmit={handleSubmit} className="glass" style={{ padding: '40px', maxWidth: '400px', width: '100%', borderRadius: '12px' }}>
        <h2 style={{ color: '#dc2743', marginBottom: '10px', textAlign: 'center' }}>Login do Cliente</h2>
        <p style={{ color: '#aaa', marginBottom: '30px', textAlign: 'center' }}>Acesse sua área restrita.</p>
        
        <div className="form-group">
          <label>E-mail</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label>Senha</label>
          <input type="password" required value={senha} onChange={e => setSenha(e.target.value)} />
        </div>
        
        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <Link to="/esqueci-senha" style={{ color: '#aaa', fontSize: '0.9rem', textDecoration: 'none' }}>Esqueci minha senha</Link>
        </div>

        {errorMessage && <div style={{ color: '#f87171', marginBottom: '20px', fontWeight: 'bold' }}>⚠️ {errorMessage}</div>}
        
        <button type="submit" className="btn" style={{ width: '100%' }} disabled={status === 'loading'}>
          {status === 'loading' ? 'Entrando...' : 'Entrar'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#aaa' }}>
          Não tem conta? <Link to="/cadastro" style={{ color: '#dc2743', fontWeight: 'bold' }}>Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
