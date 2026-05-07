import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Hero = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <section className="hero">
      <div className="hero-bg"></div>
      <div className="container">
        <div className="hero-content animate-fade-in">
          <div style={{ marginBottom: '30px' }}>
            <img
              src="/logo_kadosh.jpg"
              alt="Logo Kadosh Auto Center"
              style={{ maxHeight: '180px', width: 'auto', borderRadius: '12px' }}
            />
          </div>
          <h1>Alta Performance e Confiança para o seu Veículo</h1>
          <p>
            Especialistas em mecânica avançada, revisão e estética automotiva.
            Traga seu carro para a Kadosh Auto Center e sinta a diferença de um serviço premium.
          </p>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn"
              onClick={() => document.getElementById('orcamento').scrollIntoView({ behavior: 'smooth' })}
            >
              Solicitar Orçamento
            </button>
            <Link to={user ? '/cliente' : '/login'} className="btn" style={{ background: 'transparent', border: '2px solid #dc2743', color: '#fff' }}>
              {user ? 'Minha Área' : 'Área do Cliente'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

