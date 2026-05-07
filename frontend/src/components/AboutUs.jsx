import React from 'react';

const AboutUs = () => {
  return (
    <section id="sobre" className="container" style={{ paddingTop: '50px', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', alignItems: 'center' }}>
        
        <div style={{ textAlign: 'center', maxWidth: '800px' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Sobre a Kadosh Auto Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '30px' }}>
            Na Kadosh Auto Center, nosso compromisso é com a excelência e a segurança do seu veículo. 
            Contamos com uma infraestrutura moderna e profissionais altamente capacitados para oferecer o melhor em mecânica, 
            revisão e estética automotiva.
          </p>
          
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://www.instagram.com/kadosh.center/" target="_blank" rel="noreferrer" className="btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(220, 39, 67, 0.1)', border: '1px solid #dc2743', color: '#dc2743' }}>
              📸 Instagram
            </a>
            <a href="https://www.tiktok.com/@kadosh.auto.center" target="_blank" rel="noreferrer" className="btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(220, 39, 67, 0.1)', border: '1px solid #dc2743', color: '#dc2743' }}>
              🎵 TikTok
            </a>
            <a href="https://maps.app.goo.gl/T932qmLaYpZyMWqe7" target="_blank" rel="noreferrer" className="btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(220, 39, 67, 0.1)', border: '1px solid #dc2743', color: '#dc2743' }}>
              📍 Nossa Localização
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
