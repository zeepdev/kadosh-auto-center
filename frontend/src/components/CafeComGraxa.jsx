import React, { useEffect, useState } from 'react';
import { OFICINA } from '../config/oficina';
import Footer from './Footer';
import Reveal from './Reveal';

// Ícone personalizado para "O que é?" (Chapéu de Formatura / Educação)
const GraduationIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
    <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
  </svg>
);

// Ícone personalizado para "Por que participar?" (Escudo com Check / Proteção)
const ShieldCheckIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 11l2 2 4-4" />
  </svg>
);

const CafeComGraxa = () => {
  const [activeEdition, setActiveEdition] = useState(2); // Default para a última edição (2)
  const [lightboxImg, setLightboxImg] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Controlar o fechamento por tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxImg(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const whatsappMessage = encodeURIComponent("Quero me tornar parceiro(a)/ patrocinar o café com graxa");
  const whatsappLink = `https://wa.me/55${OFICINA.telefone.replace(/\D/g, '')}?text=${whatsappMessage}`;

  const colors = {
    bgLight: '#FAF3EB', // Creme quente/café com leite (fundo do logo e da página)
    bgDark: '#1E120A', // Marrom café profundo para seções escuras
    primary: '#B85E3B', // Terracota / Café Torrado
    secondary: '#D68970', // Rosa terracota suave
    accent: '#8C4327', // Marrom café
    textDark: '#2C1B11', // Grão de café escuro
    textLight: '#ffffff',
    glassBg: 'rgba(255, 255, 255, 0.45)',
    glassBorder: 'rgba(44, 27, 17, 0.08)'
  };

  const editions = [
    {
      id: 1,
      name: "1ª Edição",
      date: "Maio / 2026",
      description: "O pontapé inicial de um projeto pioneiro. Uma manhã inesquecível de muito aprendizado, união e capacitação feminina na prática.",
      images: [
        "/images/cafe-galeria-1.jpg",
        "/images/cafe-galeria-2.jpg",
        "/images/cafe-galeria-3.jpg",
        "/images/cafe-galeria-4.png",
        "/images/cafe-galeria-5.jpg"
      ]
    },
    {
      id: 2,
      name: "2ª Edição",
      date: "Junho / 2026",
      description: "A consolidação do Café com Graxa. Mais mulheres unidas desmistificando a mecânica de forma descomplicada com dinâmicas inéditas.",
      images: [
        "/images/cafe-galeria-2-1.jpg",
        "/images/cafe-galeria-2-2.jpg",
        "/images/cafe-galeria-2-3.jpg",
        "/images/cafe-galeria-2-4.jpg",
        "/images/cafe-galeria-2-5.jpg",
        "/images/cafe-galeria-2-7.jpg",
        "/images/cafe-galeria-2-8.jpg"
      ]
    }
  ];

  const currentEdition = editions.find(e => e.id === activeEdition) || editions[1];

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxImg(currentEdition.images[index]);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    const prevIdx = (lightboxIndex - 1 + currentEdition.images.length) % currentEdition.images.length;
    setLightboxIndex(prevIdx);
    setLightboxImg(currentEdition.images[prevIdx]);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    const nextIdx = (lightboxIndex + 1) % currentEdition.images.length;
    setLightboxIndex(nextIdx);
    setLightboxImg(currentEdition.images[nextIdx]);
  };

  return (
    <div style={{ backgroundColor: colors.bgLight, color: colors.textDark, minHeight: '100vh', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
      
      {/* Estilos e Animações Inline */}
      <style>{`
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-5px) scale(1.02); }
        }
        .floating-logo {
          animation: floatLogo 6s ease-in-out infinite;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .edition-gallery {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .glass-card {
          background: ${colors.glassBg};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid ${colors.glassBorder};
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-card:hover {
          transform: translateY(-5px);
          border-color: ${colors.primary};
          box-shadow: 0 16px 32px rgba(44, 27, 17, 0.06);
        }
        .btn-main {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: ${colors.primary};
          color: white;
          padding: 16px 36px;
          border-radius: 8px;
          font-weight: 800;
          font-family: 'Archivo', sans-serif;
          font-size: 0.95rem;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 10px 24px rgba(184, 94, 59, 0.25);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border: none;
          cursor: pointer;
        }
        .btn-main:hover {
          background: ${colors.accent};
          transform: translateY(-3px);
          box-shadow: 0 14px 30px rgba(140, 67, 39, 0.35);
        }
        .btn-ghost-cafe {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.6);
          color: ${colors.textDark};
          padding: 16px 36px;
          border-radius: 8px;
          font-weight: 800;
          font-family: 'Archivo', sans-serif;
          font-size: 0.95rem;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 1px solid rgba(44, 27, 17, 0.2);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .btn-ghost-cafe:hover {
          border-color: ${colors.primary};
          background: rgba(184, 94, 59, 0.08);
          transform: translateY(-3px);
        }
        .gallery-photo-container {
          position: relative;
          aspect-ratio: 1;
          border-radius: 16px;
          overflow: hidden;
          background: ${colors.accent};
          cursor: pointer;
          box-shadow: 0 8px 16px rgba(44, 27, 17, 0.03);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .gallery-photo-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .gallery-photo-container:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(44, 27, 17, 0.12);
        }
        .gallery-photo-container:hover img {
          transform: scale(1.08);
        }
        .gallery-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(44, 27, 17, 0.8), transparent 70%);
          display: flex;
          align-items: flex-end;
          padding: 20px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .gallery-photo-container:hover .gallery-overlay {
          opacity: 1;
        }
        .arrow-btn {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: white;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.5rem;
          transition: all 0.3s;
          backdrop-filter: blur(8px);
        }
        .arrow-btn:hover {
          background: white;
          color: ${colors.accent};
          transform: scale(1.1);
        }
        
        /* Estilos do Split Hero com Fundo Claro */
        .hero-cafe {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          overflow: hidden;
          padding: 130px 0 70px;
          background-color: ${colors.bgLight};
          color: ${colors.textDark};
        }
        .hero-cafe-bg {
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(1000px 700px at 80% 20%, rgba(184, 94, 59, 0.12), transparent 55%),
            linear-gradient(180deg, #FAF3EB 0%, #F5EAE0 100%);
        }
        .hero-cafe-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(44, 27, 17, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(44, 27, 17, 0.02) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: radial-gradient(circle at 50% 40%, #000 0%, transparent 75%);
          -webkit-mask-image: radial-gradient(circle at 50% 40%, #000 0%, transparent 75%);
        }
        .hero-cafe-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          align-items: center;
          gap: 48px;
          width: 100%;
        }
        .hero-cafe-text {
          position: relative;
          z-index: 10;
        }
        .hero-cafe-photo {
          position: relative;
          z-index: 5;
        }
        .hcp-frame {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          aspect-ratio: 4/3;
          border: 1px solid rgba(44, 27, 17, 0.08);
          clip-path: polygon(8% 0, 100% 0, 100% 100%, 0 100%);
          box-shadow: 0 30px 60px -20px rgba(44, 27, 17, 0.15);
        }
        .hcp-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          animation: kenburns-cafe 18s ease-in-out infinite alternate;
        }
        @keyframes kenburns-cafe {
          from { transform: scale(1.02); }
          to { transform: scale(1.12); }
        }
        .hcp-shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(250, 243, 235, 0.6) 0%, transparent 40%),
            linear-gradient(0deg, rgba(184, 94, 59, 0.18) 0%, transparent 35%);
        }
        .hcp-scan {
          position: absolute;
          left: 0; right: 0; height: 2px; top: 0;
          background: linear-gradient(90deg, transparent, ${colors.primary}, transparent);
          opacity: 0.6;
          animation: scan-cafe 5s linear infinite;
        }
        @keyframes scan-cafe {
          0% { top: -2%; opacity: 0; }
          10% { opacity: .6; }
          90% { opacity: .6; }
          100% { top: 102%; opacity: 0; }
        }
        .hcp-diag {
          position: absolute;
          pointer-events: none;
          background: linear-gradient(180deg, ${colors.primary}, ${colors.accent});
          transform: skewX(-18deg);
          border-radius: 2px;
        }
        .hcp-diag.d1 { top: -14px; right: 16%; width: 18px; height: 64%; opacity: 0.9; }
        .hcp-diag.d2 { bottom: -14px; right: 6%; width: 10px; height: 40%; opacity: 0.55; }
        
        .hero-cafe-cta-row {
          display: flex;
          gap: 16px;
          margin-top: 30px;
          flex-wrap: wrap;
        }

        /* Animações de Entrada Dinâmicas Customizadas */
        .reveal.reveal-left-custom {
          opacity: 0;
          transform: translateX(-70px);
          transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.reveal-left-custom.is-visible {
          opacity: 1;
          transform: translateX(0);
        }
        
        .reveal.reveal-right-custom {
          opacity: 0;
          transform: translateX(70px);
          transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.reveal-right-custom.is-visible {
          opacity: 1;
          transform: translateX(0);
        }

        @media (max-width: 960px) {
          .hero-cafe-grid { grid-template-columns: 1fr; text-align: center; gap: 40px; }
          .hero-cafe-text { display: flex; flex-direction: column; align-items: center; }
          .hero-cafe-text p { margin-left: auto; margin-right: auto; }
          .hero-cafe-cta-row { justify-content: center; }
          .hero-cafe-photo { max-width: 520px; margin: 0 auto; width: 100%; }
          .hcp-frame { clip-path: none; }
          .hcp-shade {
            background:
              linear-gradient(180deg, rgba(250, 243, 235, 0.4) 0%, transparent 40%),
              linear-gradient(0deg, rgba(184, 94, 59, 0.18) 0%, transparent 35%);
          }
        }
      `}</style>

      {/* Hero Section Split (Clara / Café com Graxa com layout moderno) */}
      <section className="hero-cafe">
        <div className="hero-cafe-bg" />

        <div className="container hero-cafe-grid">
          
          {/* Lado Esquerdo: Conteúdo Textual */}
          <div className="hero-cafe-text animate-fade-in">
            {/* Logo de Cabeçalho Flutuante */}
            <div className="floating-logo" style={{ 
              width: '110px', 
              height: '110px', 
              backgroundColor: colors.white, 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: `0 12px 30px rgba(44, 27, 17, 0.08)`,
              border: `3px solid ${colors.primary}`,
              overflow: 'hidden',
              marginBottom: '25px'
            }}>
              <img src="/cafe-graxa-logo.PNG" alt="Emblema Café com Graxa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <span className="eyebrow" style={{ color: colors.primary }}>Kadosh Auto Center</span>
            
            <h1 style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: 'clamp(2.8rem, 6.5vw, 4.8rem)',
              lineHeight: 1.1,
              textTransform: 'uppercase',
              marginBottom: '20px',
              letterSpacing: '0.5px',
              color: colors.textDark
            }}>
              Café com<br />
              <span style={{ color: colors.primary }}>Graxa</span>
            </h1>
            
            <p style={{
              fontSize: '1.2rem',
              color: colors.textDark,
              opacity: 0.9,
              marginBottom: '30px',
              maxWidth: '560px',
              lineHeight: 1.65
            }}>
              Um encontro prático e dinâmico feito exclusivamente para o público feminino. Entenda a mecânica do seu carro com facilidade, livre de jargões e em um espaço seguro.
            </p>

            <div className="hero-cafe-cta-row">
              <a href="https://forms.gle/KJd5YR4weRBu5s6f8" target="_blank" rel="noreferrer" className="btn-main">
                📝 Fazer Inscrição
              </a>
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="btn-ghost-cafe">
                🤝 Patrocinar Evento
              </a>
            </div>
          </div>

          {/* Lado Direito: Foto Principal do Evento */}
          <div className="hero-cafe-photo animate-fade-in" style={{ animationDelay: '150ms' }}>
            <div className="hcp-frame">
              <img className="hcp-img" src="/images/cafe-galeria-2-4.jpg" alt="Mulheres no Café com Graxa Kadosh" />
              <span className="hcp-shade" />
              <span className="hcp-scan" />
            </div>
            <span className="hcp-diag d1" />
            <span className="hcp-diag d2" />
          </div>

        </div>
      </section>

      {/* Banner Oficial do Evento */}
      <section style={{ backgroundColor: colors.bgLight, padding: '60px 24px 40px' }}>
        <Reveal dir="up" className="container" style={{ maxWidth: '1050px', margin: '0 auto' }}>
          <div style={{
            position: 'relative',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(44, 27, 17, 0.06)',
            border: `1px solid ${colors.glassBorder}`
          }}>
            <img 
              src="/images/cafe-graxa-banner.png" 
              alt="Banner Informativo Café com Graxa" 
              style={{ width: '100%', display: 'block' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
          </div>
        </Reveal>
      </section>

      {/* Sobre o Evento */}
      <section style={{ padding: '80px 24px', background: '#F5EAE0' }}>
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px' }}>
            
            <Reveal className="reveal-left-custom">
              <div className="glass-card" style={{ padding: '50px 40px', borderRadius: '24px', height: '100%' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  backgroundColor: colors.primary,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '28px',
                  boxShadow: '0 8px 20px rgba(184, 94, 59, 0.2)'
                }}>
                  <GraduationIcon />
                </div>
                <h2 style={{ fontSize: '2.1rem', color: colors.accent, marginBottom: '20px', fontFamily: 'Archivo' }}>
                  O que é o evento?
                </h2>
                <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: colors.textDark, opacity: 0.9 }}>
                  O Café com Graxa é um encontro dinâmico feito exclusivamente para o público feminino. 
                  Nosso objetivo é explicar, com dinâmicas diretas e práticas com peças de carros de verdade, como funciona a mecânica veicular, ensinando diagnósticos essenciais do dia a dia.
                </p>
              </div>
            </Reveal>

            <Reveal className="reveal-right-custom">
              <div className="glass-card" style={{ padding: '50px 40px', borderRadius: '24px', height: '100%' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  backgroundColor: colors.accent,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '28px',
                  boxShadow: '0 8px 20px rgba(140, 67, 39, 0.2)'
                }}>
                  <ShieldCheckIcon />
                </div>
                <h2 style={{ fontSize: '2.1rem', color: colors.primary, marginBottom: '20px', fontFamily: 'Archivo' }}>
                  Por que participar?
                </h2>
                <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: colors.textDark, opacity: 0.9 }}>
                  O mercado mecânico muitas vezes subestima o conhecimento feminino. Nós criamos esse espaço seguro para capacitar as mulheres com conhecimento real, protegendo-as de golpes e auxiliando na manutenção consciente do seu veículo.
                </p>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* Galeria de Fotos Separada por Edições */}
      <section style={{ padding: '100px 24px', backgroundColor: colors.bgDark, color: colors.bgLight, position: 'relative' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #1E120A 0%, #120A05 100%)',
          zIndex: 0
        }} />

        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Reveal dir="up">
            <span style={{
              display: 'inline-block',
              color: colors.secondary,
              fontWeight: '800',
              fontFamily: 'Archivo',
              fontSize: '0.85rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '15px'
            }}>
              Galeria Histórica
            </span>
            <h2 style={{ fontSize: '3rem', marginBottom: '18px', color: colors.textLight, fontFamily: 'Archivo', textTransform: 'uppercase' }}>
              Nossa Trajetória
            </h2>
            <p style={{ fontSize: '1.2rem', opacity: 0.75, maxWidth: '600px', margin: '0 auto 50px' }}>
              Navegue pelas edições anteriores do Café com Graxa e veja a energia e união das participantes.
            </p>
          </Reveal>

          {/* Abas Seletoras com Mini Logo Redondo */}
          <Reveal dir="up" delay={150}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '50px',
              flexWrap: 'wrap'
            }}>
              {editions.map((ed) => {
                const isActive = activeEdition === ed.id;
                return (
                  <button
                    key={ed.id}
                    onClick={() => setActiveEdition(ed.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 28px',
                      borderRadius: '50px',
                      border: '2px solid',
                      borderColor: isActive ? colors.secondary : 'rgba(255,255,255,0.08)',
                      backgroundColor: isActive ? colors.secondary : 'rgba(255,255,255,0.03)',
                      color: isActive ? colors.textDark : colors.textLight,
                      fontWeight: '800',
                      fontFamily: 'Archivo',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? `0 10px 25px rgba(214, 137, 112, 0.35)` : 'none',
                      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = colors.secondary;
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                      }
                    }}
                  >
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: colors.white,
                      border: `1.5px solid ${colors.primary}`,
                      overflow: 'hidden'
                    }}>
                      <img src="/cafe-graxa-logo.PNG" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </span>
                    {ed.name}
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Galeria Grid com Animação ao Alternar Edição */}
          <div key={activeEdition} className="edition-gallery">
            <p style={{
              fontSize: '1.25rem',
              color: colors.textLight,
              opacity: 0.9,
              fontStyle: 'italic',
              maxWidth: '750px',
              margin: '0 auto 40px',
              lineHeight: 1.7
            }}>
              "{currentEdition.description}"
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {currentEdition.images.map((imgSrc, index) => (
                <div 
                  key={index} 
                  className="gallery-photo-container"
                  onClick={() => openLightbox(index)}
                >
                  <img 
                    src={imgSrc} 
                    alt={`${currentEdition.name} - Imagem ${index + 1}`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#332014', color: 'rgba(255,255,255,0.3)' }}>
                    📷 Foto {index + 1}
                  </div>
                  <div className="gallery-overlay">
                    <span style={{ color: 'white', fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      🔎 Visualizar Foto
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Lightbox / Visualizador de Imagem */}
      {lightboxImg && (
        <div 
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28, 16, 10, 0.92)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '24px',
            animation: 'fadeInFast 0.3s ease-out forwards'
          }}
        >
          {/* Botão de Fechar */}
          <button 
            onClick={() => setLightboxImg(null)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '2.5rem',
              cursor: 'pointer',
              lineHeight: 1,
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ✕
          </button>

          {/* Seta Esquerda */}
          <button className="arrow-btn" onClick={handlePrev} style={{ position: 'absolute', left: '24px' }}>
            ‹
          </button>

          {/* Imagem Central */}
          <div style={{ maxWidth: '90%', maxHeight: '85%', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <img 
              src={lightboxImg} 
              alt="Visualização" 
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: '12px',
                boxShadow: '0 30px 70px rgba(0,0,0,0.5)',
                objectFit: 'contain',
                display: 'block'
              }}
            />
            {/* Indicador de Quantidade */}
            <div style={{
              position: 'absolute',
              bottom: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.95rem',
              fontWeight: '600'
            }}>
              Foto {lightboxIndex + 1} de {currentEdition.images.length}
            </div>
          </div>

          {/* Seta Direita */}
          <button className="arrow-btn" onClick={handleNext} style={{ position: 'absolute', right: '24px' }}>
            ›
          </button>
        </div>
      )}

      {/* Seção Patrocínio / CTA */}
      <section style={{ padding: '100px 24px', textAlign: 'center', background: '#F5EAE0' }}>
        <Reveal dir="up" className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ 
            backgroundColor: colors.white, 
            padding: '60px 40px', 
            borderRadius: '32px', 
            boxShadow: '0 25px 60px rgba(184, 94, 59, 0.08)',
            border: `1px solid ${colors.glassBorder}`
          }}>
            <h2 style={{ fontSize: '2.5rem', color: colors.primary, marginBottom: '22px', fontFamily: 'Archivo', textTransform: 'uppercase' }}>
              Faça Parte do Café com Graxa!
            </h2>
            
            <p style={{ fontSize: '1.2rem', color: colors.textDark, lineHeight: 1.7, marginBottom: '36px', opacity: 0.9 }}>
              Nossas edições contam com sorteios exclusivos, brindes personalizados, coffee break delicioso e muitas surpresas. 
              Sua empresa ou marca parceira pode apoiar este movimento transformador.
            </p>
            
            <a 
              href={whatsappLink} 
              target="_blank" 
              rel="noreferrer"
              className="btn-main"
            >
              🤝 Seja nosso parceiro(a)
            </a>
            
            <p style={{ marginTop: '20px', fontSize: '0.92rem', color: colors.textDark, opacity: 0.6, fontWeight: '500' }}>
              Converse diretamente com o nosso time de organizadores pelo WhatsApp.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Footer Global com tema Café */}
      <Footer theme="cafe" />

    </div>
  );
};

export default CafeComGraxa;
