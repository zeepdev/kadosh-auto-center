import React from 'react';
import Reveal from './Reveal';

const Gallery = () => {
  return (
    <section className="container" style={{ paddingTop: '90px', paddingBottom: '100px' }}>
      <Reveal style={{ textAlign: 'center', marginBottom: '40px' }}>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Nossa Estrutura</span>
        <h2 className="section-title">Cuidado de perto<br />com o seu veículo</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '14px' }}>
          Confira um pouco do nosso espaço e do cuidado com cada carro.
        </p>
      </Reveal>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}>
        {[1, 2, 3, 4].map((num, idx) => (
          <Reveal
            key={num}
            delay={idx * 90}
            style={{ overflow: 'hidden', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', aspectRatio: '4/5', border: '1px solid var(--hairline)', position: 'relative' }}
          >
            <img
              src={`/foto${num}.jpeg`}
              alt={`Estrutura Kadosh ${num}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.07)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default Gallery;
