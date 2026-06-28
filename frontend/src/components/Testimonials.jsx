import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const Testimonials = () => {
  const [depoimentos, setDepoimentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepoimentos();
  }, []);

  const fetchDepoimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('depoimentos')
        .select('*, clientes(foto_url)')
        .eq('aprovado', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepoimentos(data || []);
    } catch (err) {
      console.error('Erro ao buscar depoimentos:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (depoimentos.length === 0) return null;

  return (
    <section id="depoimentos" className="testimonials-section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Depoimentos</span>
          <h2 className="section-title" style={{ marginBottom: '10px' }}>O que dizem nossos clientes</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>A satisfação de quem confia o seu veículo à Kadosh Auto Center.</p>
          
          {/* Google Reviews Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '15px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '12px 24px',
            borderRadius: '50px',
            marginBottom: '10px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <svg viewBox="0 0 24 24" width="20" height="20" style={{ minWidth: '20px' }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#fff' }}>4.9</span>
                <span style={{ color: '#f59e0b', fontSize: '1.1rem', letterSpacing: '1px' }}>★★★★★</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Excelente no Google Reviews</span>
            </div>
            <a 
              href="https://www.google.com/maps/search/?api=1&query=Kadosh+Auto+Center+Av.+Goi%C3%A1s+6144+Goi%C3%A2nia"
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'var(--accent-color, #e10600)',
                color: '#fff',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '30px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginLeft: '10px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(220, 39, 67, 0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 39, 67, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 39, 67, 0.3)';
              }}
            >
              Ver avaliações no Google ↗
            </a>
          </div>
        </div>

        <div className="testimonials-grid">
          {depoimentos.map((d) => (
            <div key={d.id} className="glass testimonial-card">
              <div className="testimonial-stars">
                {'★'.repeat(d.estrelas)}{'☆'.repeat(5 - d.estrelas)}
              </div>
              <p className="testimonial-text">"{d.comentario}"</p>
              <div className="testimonial-footer">
                <div className="testimonial-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {d.clientes?.foto_url ? (
                    <img src={d.clientes.foto_url} alt={d.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    d.nome.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="testimonial-name">{d.nome}</p>
                  <p className="testimonial-date">{new Date(d.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>
        {`
          .testimonials-section {
            background: linear-gradient(to bottom, var(--bg-primary), var(--bg-secondary));
            padding: 100px 0;
          }
          .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
          }
          .testimonial-card {
            padding: 40px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            transition: all 0.3s ease;
          }
          .testimonial-card:hover {
            transform: translateY(-5px);
            border-color: var(--accent-color);
          }
          .testimonial-stars {
            color: #f59e0b;
            font-size: 1.2rem;
            letter-spacing: 2px;
          }
          .testimonial-text {
            font-style: italic;
            color: #ddd;
            line-height: 1.7;
            flex-grow: 1;
          }
          .testimonial-footer {
            display: flex;
            align-items: center;
            gap: 15px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.05);
          }
          .testimonial-avatar {
            width: 45px;
            height: 45px;
            background: var(--accent-color);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.2rem;
          }
          .testimonial-name {
            font-weight: bold;
            margin: 0;
          }
          .testimonial-date {
            font-size: 0.8rem;
            color: #666;
            margin: 0;
          }
        `}
      </style>
    </section>
  );
};

export default Testimonials;
