import React from 'react';

const Gallery = () => {
  return (
    <section className="container" style={{ paddingTop: '50px', paddingBottom: '100px' }}>
      <h2 style={{ fontSize: '2.5rem', marginBottom: '10px', textAlign: 'center' }}>Nossa Estrutura</h2>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '40px' }}>Confira um pouco do nosso espaço e do cuidado com os veículos.</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        {[1, 2, 3, 4].map((num) => (
          <div key={num} style={{ overflow: 'hidden', borderRadius: '16px', boxShadow: '0 10px 20px rgba(0,0,0,0.5)', aspectRatio: '4/5', border: '1px solid rgba(255,255,255,0.05)' }}>
            <img 
              src={`/foto${num}.jpg`} 
              alt={`Estrutura Kadosh ${num}`} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }} 
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} 
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} 
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default Gallery;
