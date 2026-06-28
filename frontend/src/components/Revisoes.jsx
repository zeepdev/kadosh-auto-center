import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';

const Revisoes = () => {
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
      padding: '100px 20px 60px 20px',
      backgroundColor: '#111'
    },
    heroBg: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundImage: `url('/images/pacotes-capa.png')`,
      background: 'linear-gradient(135deg, rgba(20, 8, 8, 0.9) 0%, rgba(10, 5, 5, 0.95) 100%), url("/images/pacotes-capa.png")',
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
      color: '#e10600'
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
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '40px',
      maxWidth: '1000px',
      margin: '0 auto'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '16px',
      overflow: 'hidden',
      textDecoration: 'none',
      color: '#fff',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column'
    },
    cardImageContainer: {
      width: '100%',
      height: '240px',
      backgroundColor: '#222',
      position: 'relative',
      overflow: 'hidden'
    },
    cardImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      opacity: 0.85,
      transition: 'transform 0.5s ease'
    },
    cardBody: {
      padding: '30px',
      textAlign: 'center',
      borderTop: '3px solid #e10600',
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    },
    cardTitle: {
      fontSize: '1.8rem',
      margin: '0 0 10px 0',
      color: '#fff'
    },
    cardSubtitle: {
      color: '#aaa',
      margin: '0 0 20px 0',
      fontSize: '0.95rem',
      lineHeight: '1.5'
    },
    cardPrice: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#4ade80',
      margin: '0 0 5px 0'
    },
    cardPriceInfo: {
      fontSize: '0.85rem',
      color: '#888',
      margin: '0 0 20px 0'
    },
    cardBtn: {
      display: 'inline-block',
      width: '100%',
      padding: '12px 0',
      background: '#e10600',
      color: '#fff',
      borderRadius: '8px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      fontSize: '0.9rem',
      transition: 'background 0.2s ease'
    }
  };

  const revisoes = [
    {
      id: 'basica',
      nome: 'Revisão Básica',
      descricao: 'Manutenção essencial para garantir a segurança e a economia do seu veículo no dia a dia.',
      preco: 'R$ 799,00',
      parcelamento: '5x de R$ 159,80',
      capa: '/images/revisao-basic.png'
    },
    {
      id: 'premium',
      nome: 'Revisão Premium',
      descricao: 'O cuidado definitivo. Alta performance, estética e revisão completa para o seu veículo.',
      preco: 'R$ 1.799,00',
      parcelamento: '5x de R$ 359,80',
      capa: '/images/revisao-premium.png'
    }
  ];

  return (
    <div style={styles.container}>
      <header style={styles.hero}>
        <div style={styles.heroBg}></div>
        <div style={styles.heroContent}>
          <h1 style={styles.title}>REVISÕES <span style={styles.highlight}>KADOSH</span></h1>
          <p style={styles.subtitle}>ESCOLHA A REVISÃO IDEAL PARA MANTER SEU CARRO <strong style={{color: '#e10600'}}>SEMPRE EM DIA</strong>.</p>
        </div>
      </header>

      <section style={styles.contentSection}>
        <div style={styles.grid}>
          {revisoes.map((revisao) => (
            <Link 
              key={revisao.id} 
              to={`/revisoes/${revisao.id}`} 
              style={styles.card}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-10px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(220, 39, 67, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(220, 39, 67, 0.4)';
                const img = e.currentTarget.querySelector('img');
                if (img) img.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                const img = e.currentTarget.querySelector('img');
                if (img) img.style.transform = 'scale(1)';
              }}
            >
              <div style={styles.cardImageContainer}>
                <img src={revisao.capa} alt={revisao.nome} style={styles.cardImage} />
              </div>
              <div style={styles.cardBody}>
                <div>
                  <h3 style={styles.cardTitle}>{revisao.nome}</h3>
                  <p style={styles.cardSubtitle}>{revisao.descricao}</p>
                </div>
                <div>
                  <p style={styles.cardPrice}>{revisao.preco}</p>
                  <p style={styles.cardPriceInfo}>ou até {revisao.parcelamento}</p>
                  <div style={styles.cardBtn}>Ver Detalhes</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer theme="dark" />
    </div>
  );
};

export default Revisoes;
