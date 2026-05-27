import React from 'react';
import { OFICINA } from '../config/oficina';

const Footer = ({ theme = 'dark' }) => {
  const isCafe = theme === 'cafe';

  const styles = {
    container: {
      backgroundColor: isCafe ? '#3b2516' : '#0a0505',
      color: isCafe ? '#fbefe0' : '#aaa',
      padding: '60px 20px 30px',
      textAlign: 'center',
      borderTop: isCafe ? 'none' : '1px solid #222',
      fontFamily: isCafe ? "'Inter', sans-serif" : "inherit"
    },
    linksContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '15px',
      marginBottom: '30px',
      flexWrap: 'wrap'
    },
    icon: {
      fontSize: '0.95rem',
      fontWeight: 'bold',
      color: isCafe ? '#fbefe0' : '#fff',
      backgroundColor: isCafe ? '#d37a54' : '#dc2743',
      textDecoration: 'none',
      padding: '12px 25px',
      borderRadius: '50px',
      transition: 'transform 0.3s ease',
      display: 'inline-block'
    },
    text: {
      fontSize: '0.9rem',
      lineHeight: 1.6,
      opacity: 0.8
    }
  };

  return (
    <footer style={styles.container}>
      <div style={styles.linksContainer}>
        <a 
          href={OFICINA.instagram} 
          target="_blank" 
          rel="noreferrer" 
          style={styles.icon}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          📷 Instagram
        </a>
        <a 
          href={OFICINA.tiktok} 
          target="_blank" 
          rel="noreferrer" 
          style={styles.icon}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          🎵 TikTok
        </a>
        <a 
          href={`https://wa.me/${OFICINA.whatsapp}`} 
          target="_blank" 
          rel="noreferrer" 
          style={styles.icon}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          💬 WhatsApp
        </a>
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFICINA.endereco)}`} 
          target="_blank" 
          rel="noreferrer" 
          style={styles.icon}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          📍 Nossa Localização
        </a>
      </div>
      <div style={styles.text}>
        <p style={{ margin: '0 0 5px 0' }}><strong>{OFICINA.nome}</strong> © {new Date().getFullYear()} - Todos os direitos reservados.</p>
        <p style={{ margin: 0 }}>{OFICINA.endereco}</p>
      </div>
    </footer>
  );
};

export default Footer;
