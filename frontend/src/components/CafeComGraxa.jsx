import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { OFICINA } from '../config/oficina';

const CafeComGraxa = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const whatsappMessage = encodeURIComponent("Quero me tornar parceiro(a)/ patrocinar o café com graxa");
  const whatsappLink = `https://wa.me/55${OFICINA.telefone.replace(/\D/g, '')}?text=${whatsappMessage}`;

  const colors = {
    bg: '#fbefe0',
    primary: '#d37a54',
    secondary: '#d98678',
    textDark: '#3b2516',
    white: '#ffffff'
  };

  return (
    <div style={{ backgroundColor: colors.bg, color: colors.textDark, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Hero Section */}
      <section style={{ 
        padding: '100px 20px 60px', 
        textAlign: 'center', 
        background: `linear-gradient(135deg, ${colors.bg} 0%, #fae5cb 100%)`,
        borderBottom: `4px solid ${colors.primary}`
      }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Logo Placeholder */}
          <div style={{ 
            width: '250px', 
            height: '250px', 
            margin: '0 auto 30px', 
            backgroundColor: colors.white, 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 20px 40px rgba(59, 37, 22, 0.1)',
            border: `5px solid ${colors.primary}`,
            overflow: 'hidden'
          }}>
            {/* O usuário vai substituir este placeholder pela imagem real futuramente */}
            <img 
              src="/cafe-graxa-logo.PNG" 
              alt="Logo Café com Graxa" 
              onError={(e) => {
                e.target.onerror = null; 
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <div style={{ display: 'none', textAlign: 'center', padding: '20px' }}>
              <span style={{ fontSize: '3rem' }}>☕🔧</span>
              <p style={{ fontSize: '0.8rem', marginTop: '10px', color: '#aaa' }}>Insira cafe-graxa-logo.png na pasta public/images</p>
            </div>
          </div>
          
          <h1 style={{ fontSize: '3.5rem', fontWeight: '900', color: colors.textDark, marginBottom: '20px', letterSpacing: '-1px' }}>
            Café com Graxa
          </h1>
          <p style={{ fontSize: '1.2rem', color: colors.textDark, opacity: 0.8, maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.6 }}>
            Um evento exclusivo para mulheres: aprenda sobre o seu carro de forma simples, prática e sem julgamentos.
          </p>
          
          <div style={{ 
            display: 'inline-block', 
            backgroundColor: colors.textDark, 
            color: colors.bg, 
            padding: '10px 30px', 
            borderRadius: '50px',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            boxShadow: '0 10px 20px rgba(59, 37, 22, 0.2)'
          }}>
            🗓️ Próxima Edição: Em Breve!
          </div>
        </div>
      </section>

      {/* Sobre o Evento */}
      <section style={{ padding: '80px 20px' }}>
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          
          <div style={{ backgroundColor: colors.white, padding: '40px', borderRadius: '20px', boxShadow: '0 15px 30px rgba(59, 37, 22, 0.05)', borderTop: `5px solid ${colors.secondary}` }}>
            <h2 style={{ fontSize: '2rem', color: colors.primary, marginBottom: '20px' }}>O que é?</h2>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: colors.textDark }}>
              O <strong>Café com Graxa</strong> é um evento exclusivo feito <strong>somente para mulheres</strong>. 
              É um momento criado para ensinar, de forma simples e sem julgamentos, sobre o funcionamento dos veículos.
              Através de palestras e ensinos práticos totalmente descomplicados, mostramos de maneira efetiva como uma mulher pode entender melhor o seu carro.
            </p>
          </div>

          <div style={{ backgroundColor: colors.white, padding: '40px', borderRadius: '20px', boxShadow: '0 15px 30px rgba(59, 37, 22, 0.05)', borderTop: `5px solid ${colors.primary}` }}>
            <h2 style={{ fontSize: '2rem', color: colors.secondary, marginBottom: '20px' }}>Por que foi criado?</h2>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: colors.textDark }}>
              A Kadosh percebeu a grande necessidade de acolher o público feminino, que muitas vezes é julgado pela sociedade como menos entendedor sobre mecânica.
              O objetivo principal é empoderar mulheres com conhecimento prático e real, evitando que passem por situações constrangedoras ou sofram golpes ao precisarem de manutenção em seus veículos.
            </p>
          </div>

        </div>
      </section>

      {/* Galeria de Fotos */}
      <section style={{ padding: '60px 20px', backgroundColor: colors.textDark, color: colors.bg }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '15px', color: colors.bg }}>Nossa História em Fotos</h2>
          <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '40px' }}>Confira os melhores momentos das edições passadas.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} style={{ 
                aspectRatio: '1', 
                backgroundColor: '#4a3224', 
                borderRadius: '12px', 
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <img 
                  src={`/images/cafe-galeria-${item}.jpg`} 
                  alt={`Galeria ${item}`}
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
                <div style={{ display: 'none', textAlign: 'center', padding: '20px', color: 'rgba(251, 239, 224, 0.5)' }}>
                  📷 Foto {item}
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: '20px', fontSize: '0.9rem', color: 'rgba(251, 239, 224, 0.5)' }}>
            (Para exibir as fotos, adicione imagens com o nome cafe-galeria-1.jpg até cafe-galeria-6.jpg na pasta public/images)
          </p>
        </div>
      </section>

      {/* Seção Patrocínio / CTA */}
      <section style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ 
            backgroundColor: colors.white, 
            padding: '50px 30px', 
            borderRadius: '24px', 
            boxShadow: '0 20px 50px rgba(211, 122, 84, 0.15)',
            border: `2px solid ${colors.bg}`
          }}>
            <h2 style={{ fontSize: '2.5rem', color: colors.primary, marginBottom: '20px' }}>Junte-se a Nós!</h2>
            
            <p style={{ fontSize: '1.2rem', color: colors.textDark, lineHeight: 1.6, marginBottom: '30px' }}>
              Cada edição do Café com Graxa conta com <strong>sorteios exclusivos, brindes e muitas surpresas</strong> para os participantes. 
              Sua marca pode fazer parte desta experiência incrível!
            </p>
            
            <a 
              href={whatsappLink} 
              target="_blank" 
              rel="noreferrer"
              style={{
                display: 'inline-block',
                backgroundColor: colors.primary,
                color: colors.white,
                padding: '18px 40px',
                borderRadius: '50px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                textDecoration: 'none',
                boxShadow: `0 10px 20px rgba(211, 122, 84, 0.3)`,
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = colors.secondary;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🤝 Seja nosso parceiro (a)
            </a>
            
            <p style={{ marginTop: '15px', fontSize: '0.9rem', color: '#888' }}>
              Fale diretamente com nossa equipe no WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* Footer minimalista do evento */}
      <footer style={{ padding: '30px 20px', textAlign: 'center', backgroundColor: colors.textDark, color: colors.bg }}>
        <p style={{ margin: 0, opacity: 0.8 }}>© {new Date().getFullYear()} Café com Graxa - Kadosh Auto Center</p>
        <Link 
          to="/" 
          style={{ 
            display: 'inline-block', 
            marginTop: '15px', 
            color: colors.primary, 
            textDecoration: 'underline',
            fontWeight: 'bold'
          }}
        >
          Voltar para o site principal
        </Link>
      </footer>

    </div>
  );
};

export default CafeComGraxa;
