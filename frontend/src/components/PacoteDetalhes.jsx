import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Footer from './Footer';

const PacoteDetalhes = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Dados temporários (mock) enquanto o financeiro não aprova as regras
  const planos = {
    basico: {
      nome: 'Plano Básico',
      preco: 'R$ 299,90',
      icone: '📋',
      descricao: 'Manutenção essencial para garantir a segurança e a economia do seu veículo no dia a dia.',
      itens: [
        'Troca de Óleo e Filtro',
        'Alinhamento e Balanceamento',
        'Revisão de Freios (Pastilhas e Discos)',
        'Check-up de 30 itens de segurança'
      ],
      beneficios: [
        'Desconto de 5% em serviços adicionais',
        'Atendimento prioritário na recepção'
      ]
    },
    premium: {
      nome: 'Plano Premium',
      preco: 'R$ 799,90',
      icone: '💎',
      descricao: 'O cuidado definitivo. Alta performance, estética e revisão completa para o seu veículo.',
      itens: [
        'Tudo do Plano Básico',
        'Higienização do Ar Condicionado',
        'Cristalização de Para-brisas',
        'Polimento Comercial',
        'Revisão completa do sistema de injeção'
      ],
      beneficios: [
        'Desconto de 15% em serviços adicionais',
        'Atendimento prioritário VIP',
        'Leva e Traz grátis (até 15km)'
      ]
    }
  };

  const plano = planos[id];

  const handleSolicitar = async () => {
    setLoading(true);
    // Simulação do envio (será integrado ao banco de dados no futuro)
    setTimeout(() => {
      alert(`Solicitação para o ${plano.nome} enviada com sucesso aos administradores! Em breve entraremos em contato.`);
      setLoading(false);
    }, 1500);
  };

  if (!plano) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0505', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Plano não encontrado.</h2>
          <Link to="/pacotes" className="btn" style={{ marginTop: '20px', display: 'inline-block' }}>Voltar aos Pacotes</Link>
        </div>
      </div>
    );
  }

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0a0505',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: '80px' // espaço pro Navbar fixo
    },
    content: {
      flex: 1,
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      width: '100%'
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px'
    },
    icon: {
      fontSize: '4rem',
      marginBottom: '10px'
    },
    title: {
      fontSize: '2.5rem',
      color: '#dc2743',
      textTransform: 'uppercase',
      margin: '0 0 10px 0'
    },
    price: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#4ade80',
      margin: '0 0 20px 0'
    },
    desc: {
      fontSize: '1.2rem',
      color: '#aaa',
      lineHeight: '1.6'
    },
    card: {
      backgroundColor: '#111',
      borderRadius: '16px',
      padding: '30px',
      border: '1px solid #333',
      marginBottom: '30px'
    },
    sectionTitle: {
      fontSize: '1.5rem',
      color: '#fff',
      borderBottom: '2px solid #dc2743',
      paddingBottom: '10px',
      marginBottom: '20px'
    },
    list: {
      listStyleType: 'none',
      padding: 0,
      margin: 0
    },
    listItem: {
      padding: '10px 0',
      borderBottom: '1px solid #222',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    check: {
      color: '#dc2743',
      fontWeight: 'bold'
    },
    ctaContainer: {
      textAlign: 'center',
      marginTop: '40px',
      padding: '30px',
      backgroundColor: 'rgba(220, 39, 67, 0.1)',
      borderRadius: '16px',
      border: '1px solid rgba(220, 39, 67, 0.3)'
    },
    alertInfo: {
      fontSize: '0.9rem',
      color: '#aaa',
      marginTop: '15px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <Link to="/pacotes" style={{ color: '#aaa', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
          ← Voltar aos Pacotes
        </Link>

        <div style={styles.header}>
          <div style={styles.icon}>{plano.icone}</div>
          <h1 style={styles.title}>{plano.nome}</h1>
          <h2 style={styles.price}>{plano.preco}</h2>
          <p style={styles.desc}>{plano.descricao}</p>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Serviços Inclusos</h3>
          <ul style={styles.list}>
            {plano.itens.map((item, index) => (
              <li key={index} style={styles.listItem}>
                <span style={styles.check}>✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Benefícios Exclusivos</h3>
          <ul style={styles.list}>
            {plano.beneficios.map((item, index) => (
              <li key={index} style={styles.listItem}>
                <span style={styles.check}>⭐</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <div style={styles.ctaContainer}>
          <h3 style={{ margin: '0 0 20px 0' }}>Gostou deste plano?</h3>
          <button 
            className="btn" 
            onClick={handleSolicitar} 
            disabled={loading}
            style={{ fontSize: '1.2rem', padding: '15px 40px', width: '100%', maxWidth: '300px' }}
          >
            {loading ? 'Enviando...' : 'Quero este Plano'}
          </button>
          <p style={styles.alertInfo}>
            (Nota: Os valores e regras definitivos estão aguardando aprovação do financeiro. Seu interesse será registrado!)
          </p>
        </div>

      </div>
      <Footer theme="dark" />
    </div>
  );
};

export default PacoteDetalhes;
