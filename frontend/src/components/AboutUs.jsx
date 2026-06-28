import React from 'react';
import Reveal from './Reveal';

const diffs = [
  'Profissionais qualificados',
  'Equipamentos de última geração',
  'Peças de qualidade',
  'Transparência e confiança',
];

const AboutUs = () => {
  return (
    <section id="sobre" className="about-section">
      <div className="container about-grid">
        <Reveal className="about-media" dir="left">
          <div className="about-frame">
            <img src="/foto1.jpeg" alt="Estrutura da Kadosh Auto Center" />
            <span className="about-frame-glow" />
          </div>
        </Reveal>

        <Reveal className="about-text" dir="right">
          <span className="eyebrow">Sobre Nós</span>
          <h2 className="section-title">Mais que uma oficina,<br />somos seu parceiro<br />na estrada.</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '18px' }}>
            Na Kadosh Auto Center, cada serviço é feito com atenção aos detalhes,
            equipamentos de alta tecnologia e uma equipe especializada pronta para te atender.
          </p>
          <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
            Nosso compromisso é com a sua segurança, o seu tempo e a performance do seu veículo.
          </p>
          <ul className="about-list">
            {diffs.map((d) => (
              <li key={d}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent-color)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-10" /></svg>
                {d}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <style>{`
        .about-grid { display: grid; grid-template-columns: 1fr 1.05fr; gap: 56px; align-items: center; }
        .about-frame { position: relative; border-radius: 16px; overflow: hidden; border: 1px solid var(--hairline); }
        .about-frame img { width: 100%; height: 100%; object-fit: cover; display: block; aspect-ratio: 4/3; transition: transform .6s ease; }
        .about-frame:hover img { transform: scale(1.05); }
        .about-frame::after { content: ''; position: absolute; left: 0; bottom: 0; width: 55%; height: 4px; background: var(--accent-color); }
        .about-frame-glow { position: absolute; inset: -1px; border-radius: 16px; box-shadow: inset 0 0 60px -20px var(--accent-glow); pointer-events: none; }
        .about-list { list-style: none; margin-top: 26px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .about-list li { display: flex; align-items: center; gap: 10px; color: #e6e6ea; font-weight: 500; }
        @media (max-width: 880px) { .about-grid { grid-template-columns: 1fr; gap: 36px; } .about-list { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
};

export default AboutUs;
