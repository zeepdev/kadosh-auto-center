import React from 'react';
import Reveal from './Reveal';

const ico = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

const Icons = {
  oleo: (
    <svg viewBox="0 0 48 48" width="48" height="48"><path {...ico} d="M8 30h16l4-4h10v8a4 4 0 01-4 4H12a4 4 0 01-4-4z" /><path {...ico} d="M14 26v-6h8l4 4" /><path {...ico} d="M30 22c2-3 4-5 4-7a4 4 0 00-8 0c0 2 2 4 4 7z" /></svg>
  ),
  suspensao: (
    <svg viewBox="0 0 48 48" width="48" height="48"><circle {...ico} cx="24" cy="9" r="3" /><circle {...ico} cx="24" cy="39" r="3" /><path {...ico} d="M24 12v3M24 33v3" /><path {...ico} d="M19 16c10 2-10 5 0 7s-10 5 0 7s-10 5 0 7" /></svg>
  ),
  alinhamento: (
    <svg viewBox="0 0 48 48" width="48" height="48"><circle {...ico} cx="24" cy="24" r="13" /><circle {...ico} cx="24" cy="24" r="5" /><path {...ico} d="M24 11v6M24 31v6M11 24h6M31 24h6" /></svg>
  ),
  freios: (
    <svg viewBox="0 0 48 48" width="48" height="48"><circle {...ico} cx="24" cy="24" r="14" /><circle {...ico} cx="24" cy="24" r="6" /><path {...ico} d="M34 16a14 14 0 00-4-3l-3 5" /><path {...ico} d="M24 10v6M24 32v6" /></svg>
  ),
  revisao: (
    <svg viewBox="0 0 48 48" width="48" height="48"><rect {...ico} x="13" y="9" width="22" height="30" rx="3" /><path {...ico} d="M19 8h10v4H19z" /><path {...ico} d="M18 19l2 2 4-4M18 28l2 2 4-4" /><path {...ico} d="M27 19h4M27 28h4" /></svg>
  ),
};

const services = [
  { title: 'Troca de Óleo', desc: 'Lubrificação e proteção para o motor.', icon: 'oleo' },
  { title: 'Suspensão', desc: 'Mais estabilidade, conforto e segurança.', icon: 'suspensao' },
  { title: 'Alinhamento e Balanceamento', desc: 'Mais segurança e vida útil dos pneus.', icon: 'alinhamento' },
  { title: 'Freios', desc: 'Segurança que você pode confiar.', icon: 'freios' },
  { title: 'Revisão Completa', desc: 'Seu carro sempre pronto para qualquer caminho.', icon: 'revisao' },
];

const Services = () => {
  return (
    <section className="container">
      <Reveal style={{ textAlign: 'center' }}>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Nossos Serviços</span>
        <h2 className="section-title">Soluções completas<br />para o seu veículo</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '14px' }}>
          Tecnologia de ponta aliada à experiência dos nossos profissionais.
        </p>
      </Reveal>

      <div className="services-grid">
        {services.map((srv, idx) => (
          <Reveal key={srv.title} className="service-card shine" delay={idx * 90}>
            <div className="service-icon">{Icons[srv.icon]}</div>
            <h3>{srv.title}</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontSize: '0.9rem' }}>{srv.desc}</p>
          </Reveal>
        ))}
      </div>


    </section>
  );
};

export default Services;
