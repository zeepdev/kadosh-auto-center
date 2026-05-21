import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { translateError } from '../../lib/errorTranslations';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw new Error(error.message);

      setStatus('success');
      setMessage('✅ Verifique sua caixa de e-mail! Enviamos um link para você redefinir sua senha.');
    } catch (error) {
      console.error(error);
      setMessage(`❌ ${translateError(error.message)}`);
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0505', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
      <form onSubmit={handleSubmit} className="glass" style={{ padding: '40px', maxWidth: '400px', width: '100%', borderRadius: '12px' }}>
        <h2 style={{ color: '#dc2743', marginBottom: '10px', textAlign: 'center' }}>Recuperar Senha</h2>
        <p style={{ color: '#aaa', marginBottom: '30px', textAlign: 'center' }}>Digite seu e-mail para receber o link de redefinição.</p>
        
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>E-mail</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={status === 'success'} />
        </div>

        {message && (
          <div style={{ color: status === 'success' ? '#4ade80' : '#f87171', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
            {message}
          </div>
        )}
        
        {status !== 'success' && (
          <button type="submit" className="btn" style={{ width: '100%', marginBottom: '20px' }} disabled={status === 'loading'}>
            {status === 'loading' ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </button>
        )}

        <p style={{ textAlign: 'center', color: '#aaa' }}>
          <Link to="/login" style={{ color: '#dc2743', fontWeight: 'bold' }}>Voltar para o Login</Link>
        </p>
      </form>
    </div>
  );
};

export default ForgotPassword;
