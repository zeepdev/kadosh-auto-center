import React from 'react';

const Services = () => {
  const services = [
    { title: "Revisão Completa", desc: "Verificação de mais de 40 itens essenciais para sua segurança.", icon: "🔧" },
    { title: "Motor e Câmbio", desc: "Diagnóstico computadorizado e reparo avançado de motores.", icon: "⚙️" },
    { title: "Suspensão e Freios", desc: "Manutenção preventiva e corretiva para máximo conforto.", icon: "🛑" },
    { title: "Estética Automotiva", desc: "Polimento, cristalização e higienização interna premium.", icon: "✨" }
  ];

  return (
    <section className="container">
      <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '20px' }}>Nossos Serviços</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tecnologia de ponta aliada à experiência de nossos profissionais.</p>
      
      <div className="services-grid">
        {services.map((srv, idx) => (
          <div key={idx} className="service-card glass">
            <div className="service-icon">{srv.icon}</div>
            <h3>{srv.title}</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>{srv.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Services;
