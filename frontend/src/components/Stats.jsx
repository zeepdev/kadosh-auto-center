import React from 'react';
import Reveal from './Reveal';

const ico = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

const Icons = {
  garantia: <svg viewBox="0 0 48 48" width="40" height="40"><path {...ico} d="M24 5l14 6v9c0 9-6 15-14 18C16 35 10 29 10 20v-9z" /><path {...ico} d="M18 24l4 4 8-8" /></svg>,
  diagnostico: <svg viewBox="0 0 48 48" width="40" height="40"><rect {...ico} x="8" y="10" width="32" height="22" rx="3" /><path {...ico} d="M13 21h4l3-5 4 10 3-7 2 2h5" /><path {...ico} d="M18 38h12M24 32v6" /></svg>,
  preco: <svg viewBox="0 0 48 48" width="40" height="40"><path {...ico} d="M25 6H12a4 4 0 00-4 4v13l17 17a3 3 0 004 0l12-12a3 3 0 000-4L25 8" /><circle cx="17" cy="15" r="2.4" fill="currentColor" stroke="none" /><path {...ico} d="M27 23a3 3 0 00-3 3M24 33a3 3 0 003-3" /><path {...ico} d="M25.5 22v12" /></svg>,
  honestidade: <svg viewBox="0 0 48 48" width="40" height="40"><path {...ico} d="M6 26l6-6 6 4 4-2 6 4 8-8" /><path {...ico} d="M6 26v4l8 6 4-2 4 2 10-7v-4" /></svg>,
};

const items = [
  { icon: 'garantia', title: 'Garantia de 90 dias', desc: 'Em todos os serviços prestados na oficina.' },
  { icon: 'diagnostico', title: 'Diagnóstico computadorizado', desc: 'Identificamos o problema com precisão, sem achismo.' },
  { icon: 'preco', title: 'Preço justo e sincero', desc: 'O que a gente combina é o que você paga, sem surpresas.' },
  { icon: 'honestidade', title: 'Honestidade com você', desc: 'Só indicamos o que o seu carro realmente precisa.' },
];

const Stats = () => {
  return (
    <section className="stats-section">
      <div className="container stats-wrap">
        <Reveal className="stats-intro" dir="left">
          <span className="eyebrow">Por que escolher a Kadosh?</span>
          <h2 className="section-title">Excelência que você sente,<br />resultados que você confia.</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '14px', maxWidth: '420px' }}>
            Na Kadosh Auto Center, cada detalhe faz a diferença. Trabalhamos para
            entregar o melhor para você e para o seu veículo.
          </p>
        </Reveal>

        <div className="stats-grid">
          {items.map((s, i) => (
            <Reveal className="stat-card" key={s.title} delay={i * 90} dir="right">
              <span className="stat-ico">{Icons[s.icon]}</span>
              <div className="stat-title">{s.title}</div>
              <div className="stat-desc">{s.desc}</div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`
        .stats-section { background: var(--bg-secondary); border-top: 1px solid var(--hairline); border-bottom: 1px solid var(--hairline); }
        .stats-wrap { display: grid; grid-template-columns: 1fr 1.2fr; gap: 50px; align-items: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; }
        .stat-card {
          background: var(--bg-elev); border: 1px solid var(--hairline);
          border-radius: 14px; padding: 28px 24px; text-align: center;
          transition: transform .3s ease, border-color .3s ease;
        }
        .stat-card:hover { transform: translateY(-6px); border-color: rgba(225,6,0,0.35); }
        .stat-ico { color: var(--accent-color); display: inline-flex; margin-bottom: 14px; }
        .stat-title { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 1.1rem; color: #fff; line-height: 1.2; }
        .stat-desc { color: var(--text-muted); font-size: 0.85rem; margin-top: 8px; line-height: 1.45; }
        @media (max-width: 880px) { .stats-wrap { grid-template-columns: 1fr; gap: 36px; } }
        @media (max-width: 460px) { .stats-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
};

export default Stats;
