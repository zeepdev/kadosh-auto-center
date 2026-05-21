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
        .select('*')
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
          <h2 style={{ fontSize: '2.5rem', color: '#dc2743', marginBottom: '10px' }}>O que dizem nossos clientes</h2>
          <p style={{ color: '#aaa' }}>A satisfação de quem confia o seu veículo à Kadosh Auto Center.</p>
        </div>

        <div className="testimonials-grid">
          {depoimentos.map((d) => (
            <div key={d.id} className="glass testimonial-card">
              <div className="testimonial-stars">
                {'★'.repeat(d.estrelas)}{'☆'.repeat(5 - d.estrelas)}
              </div>
              <p className="testimonial-text">"{d.comentario}"</p>
              <div className="testimonial-footer">
                <div className="testimonial-avatar">
                  {d.nome.charAt(0).toUpperCase()}
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
            background: linear-gradient(to bottom, #0a0505, #140808);
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
