import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { OFICINA } from '../config/oficina';

const trust = [
  { t: 'Confiança', d: 'Transparência em cada serviço.', icon: 'shield' },
  { t: 'Qualidade', d: 'Equipamentos modernos.', icon: 'gear' },
  { t: 'Desempenho', d: 'Cuidamos do que te move.', icon: 'gauge' },
  { t: 'Compromisso', d: 'Seu tempo é prioridade.', icon: 'hands' },
];

const TrustIcon = ({ name }) => {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'shield':
      return <svg viewBox="0 0 24 24" width="28" height="28"><path {...p} d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path {...p} d="M9 12l2 2 4-4" /></svg>;
    case 'gear':
      return <svg viewBox="0 0 24 24" width="28" height="28"><circle {...p} cx="12" cy="12" r="3" /><path {...p} d="M19.4 13a7.8 7.8 0 000-2l1.6-1.2-1.8-3.1-1.9.8a7.6 7.6 0 00-1.7-1L14.4 3h-3.6l-.3 2.1a7.6 7.6 0 00-1.7 1l-1.9-.8L4.7 8.4 6.3 9.6a7.8 7.8 0 000 2L4.7 12.8l1.8 3.1 1.9-.8c.5.4 1.1.8 1.7 1l.3 2.1h3.6l.3-2.1c.6-.2 1.2-.6 1.7-1l1.9.8 1.8-3.1z" /></svg>;
    case 'gauge':
      return <svg viewBox="0 0 24 24" width="28" height="28"><path {...p} d="M4 15a8 8 0 1116 0" /><path {...p} d="M12 15l4-4" /><circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" /></svg>;
    case 'hands':
      return <svg viewBox="0 0 24 24" width="28" height="28"><path {...p} d="M3 12l4-4 4 4 2-2 4 4 4-4" /><path {...p} d="M3 12v3l5 4 3-2 3 2 5-4v-3" /></svg>;
    default:
      return null;
  }
};

const Hero = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section className="hero hero-v2">
      <div className="hero-bg"></div>

      <div className="container hero-grid">
        {/* Texto */}
        <div className="hero-text animate-fade-in">
          <span className="eyebrow">Kadosh Auto Center</span>
          <h1>
            Cuidado que<br />você sente.<br />
            <span className="accent">Confiança que<br />você merece.</span>
          </h1>
          <p>
            Serviços automotivos com excelência, tecnologia e honestidade
            para garantir segurança e performance em cada km.
          </p>
          <div className="hero-cta">
            <a href={`https://wa.me/${OFICINA.whatsapp}`} target="_blank" rel="noreferrer" className="btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
              Fale no WhatsApp
            </a>
            <button className="btn-ghost" onClick={() => scrollTo('servicos')}>Nossos Serviços</button>
          </div>
          <div className="hero-sublinks">
            <button onClick={() => scrollTo('orcamento')}>Solicitar Orçamento</button>
            <span className="dot">•</span>
            <Link to={user ? '/cliente' : '/login'}>{user ? 'Minha Área' : 'Área do Cliente'}</Link>
            <span className="dot">•</span>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFICINA.endereco)}`} target="_blank" rel="noreferrer">📍 Localização</a>
          </div>
        </div>

        {/* Foto */}
        <div className="hero-photo">
          <div className="hp-frame">
            <img className="hp-img" src="/foto1.jpeg" alt="Fachada da Kadosh Auto Center" />
            <span className="hp-shade" />
            <span className="hp-scan" />
          </div>
          <span className="hp-diag d1" />
          <span className="hp-diag d2" />
        </div>
      </div>

      {/* Faixa de confiança */}
      <div className="container">
        <div className="trust-strip">
          {trust.map((b) => (
            <div className="trust-item" key={b.t}>
              <span className="trust-ico"><TrustIcon name={b.icon} /></span>
              <div>
                <h4>{b.t}</h4>
                <p>{b.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hero-v2 { flex-direction: column; justify-content: center; align-items: stretch; padding-top: 110px; padding-bottom: 44px; }
        .hero-grid {
          display: grid;
          grid-template-columns: 1.02fr 0.98fr;
          align-items: center;
          gap: 48px;
          width: 100%;
        }
        .hero-text h1 { margin-bottom: 22px; }
        .hero-cta { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 22px; }
        .hero-sublinks { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; color: var(--text-muted); font-size: 0.9rem; }
        .hero-sublinks button, .hero-sublinks a { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem; font-family: inherit; transition: color .2s; }
        .hero-sublinks button:hover, .hero-sublinks a:hover { color: var(--accent-color); }
        .hero-sublinks .dot { color: var(--text-dim); }

        /* Foto com corte diagonal */
        .hero-photo { position: relative; }
        .hp-frame {
          position: relative; overflow: hidden; border-radius: 16px;
          aspect-ratio: 4/3; border: 1px solid var(--hairline);
          clip-path: polygon(8% 0, 100% 0, 100% 100%, 0 100%);
          box-shadow: 0 30px 70px -30px rgba(0,0,0,0.9);
        }
        .hp-img { width: 100%; height: 100%; object-fit: cover; display: block; animation: kenburns 18s ease-in-out infinite alternate; }
        @keyframes kenburns { from { transform: scale(1.02); } to { transform: scale(1.12); } }
        /* Sombra que blenda com o fundo na esquerda + brilho vermelho na base */
        .hp-shade {
          position: absolute; inset: 0; pointer-events: none;
          background:
            linear-gradient(90deg, rgba(8,8,10,0.85) 0%, rgba(8,8,10,0.15) 30%, transparent 55%),
            linear-gradient(0deg, rgba(225,6,0,0.25) 0%, transparent 35%);
        }
        /* Linha de varredura vermelha (tech, sutil) */
        .hp-scan { position: absolute; left: 0; right: 0; height: 2px; top: 0; background: linear-gradient(90deg, transparent, var(--accent-color), transparent); opacity: 0.7; animation: scan 5s linear infinite; }
        @keyframes scan { 0% { top: -2%; opacity: 0; } 10% { opacity: .7; } 90% { opacity: .7; } 100% { top: 102%; opacity: 0; } }

        .hp-diag { position: absolute; pointer-events: none; background: linear-gradient(180deg, var(--accent-color), var(--accent-deep)); transform: skewX(-18deg); border-radius: 2px; }
        .hp-diag.d1 { top: -14px; right: 16%; width: 18px; height: 64%; opacity: 0.9; }
        .hp-diag.d2 { bottom: -14px; right: 6%; width: 10px; height: 40%; opacity: 0.55; }

        /* Faixa de confiança */
        .trust-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; margin-top: 40px; padding-top: 32px; border-top: 1px solid var(--hairline); }
        .trust-item { display: flex; gap: 13px; align-items: flex-start; }
        .trust-ico { color: var(--accent-color); flex-shrink: 0; display: inline-flex; padding: 10px; border-radius: 10px; background: var(--accent-soft); border: 1px solid rgba(225,6,0,0.2); }
        .trust-item h4 { font-size: 0.95rem; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px; }
        .trust-item p { color: var(--text-muted); font-size: 0.82rem; line-height: 1.4; }

        @media (prefers-reduced-motion: reduce) { .hp-img, .hp-scan { animation: none; } }
        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr; text-align: center; gap: 34px; }
          .hero-text { display: flex; flex-direction: column; align-items: center; }
          .hero-text p { margin-left: auto; margin-right: auto; }
          .hero-cta, .hero-sublinks { justify-content: center; }
          .hero-photo { max-width: 520px; margin: 0 auto; width: 100%; }
        }
        @media (max-width: 720px) { .trust-strip { grid-template-columns: repeat(2, 1fr); gap: 18px; } }
        @media (max-width: 420px) { .trust-strip { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
};

export default Hero;
