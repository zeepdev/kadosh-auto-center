import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';

const Pacotes = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0a0505',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column'
    },
    hero: {
      position: 'relative',
      width: '100%',
      minHeight: '40vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '60px 20px',
      backgroundColor: '#111'
    },
    heroBg: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundImage: `url('/images/pacotes-capa.png')`,
      background: 'linear-gradient(135deg, rgba(220, 39, 67, 0.4) 0%, rgba(10, 5, 5, 0.9) 100%), url("/images/pacotes-capa.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      zIndex: 1
    },
    heroContent: {
      position: 'relative',
      zIndex: 2,
      textAlign: 'center',
      maxWidth: '800px'
    },
    title: {
      fontSize: '3rem',
      color: '#fff',
      textTransform: 'uppercase',
      marginBottom: '15px',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
    },
    highlight: {
      color: '#dc2743'
    },
    subtitle: {
      fontSize: '1.2rem',
      color: '#ddd',
      textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
    },
    contentSection: {
      padding: '80px 20px',
      flex: 1
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '40px',
      maxWidth: '1000px',
      margin: '0 auto'
    },
    card: {
      backgroundColor: '#111',
      borderRadius: '16px',
      overflow: 'hidden',
      textDecoration: 'none',
      color: '#fff',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      border: '1px solid #333',
      display: 'flex',
      flexDirection: 'column'
    },
    cardImageContainer: {
      width: '100%',
      height: '220px',
      backgroundColor: '#222',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    },
    cardImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      opacity: 0.8
    },
    cardIcon: {
      position: 'absolute',
      fontSize: '4rem',
      color: '#fff',
      textShadow: '2px 2px 10px rgba(220, 39, 67, 0.8)'
    },
    cardBody: {
      padding: '30px',
      textAlign: 'center',
      borderTop: '3px solid #dc2743'
    },
    cardTitle: {
      fontSize: '1.8rem',
      margin: '0 0 10px 0',
      color: '#fff'
    },
    cardSubtitle: {
      color: '#aaa',
      margin: 0,
      fontSize: '1rem'
    }
  };

  const pacotes = [
    {
      id: 'basico',
      nome: 'Plano Básico',
      descricao: 'Manutenção essencial para segurança e economia.',
      icone: '📋'
    },
    {
      id: 'premium',
      nome: 'Plano Premium',
      descricao: 'Cuidado completo para alta performance do seu veículo.',
      icone: '💎'
    }
  ];

  return (
    <div style={styles.container}>
      <header style={styles.hero}>
        <div style={styles.heroBg}></div>
        <div style={styles.heroContent}>
          <h1 style={styles.title}>PACOTES <span style={styles.highlight}>KADOSH</span></h1>
          <p style={styles.subtitle}>ESCOLHA O PACOTE IDEAL PARA MANTER SEU CARRO <strong style={{color: '#dc2743'}}>SEMPRE EM DIA</strong>.</p>
        </div>
      </header>

      <section style={styles.contentSection}>
        <div style={styles.grid}>
          {pacotes.map((pacote) => (
            <Link 
              key={pacote.id} 
              to={`/pacotes/${pacote.id}`} 
              style={styles.card}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-10px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(220, 39, 67, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
              }}
            >
              <div style={styles.cardImageContainer}>
                {/* Aqui você pode adicionar as fotos específicas de cada plano depois */}
                <div style={styles.cardIcon}>{pacote.icone}</div>
              </div>
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>{pacote.nome}</h3>
                <p style={styles.cardSubtitle}>{pacote.descricao}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer theme="dark" />
    </div>
  );
};

export default Pacotes;
