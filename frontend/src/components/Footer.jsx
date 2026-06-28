import React from 'react';
import { Link } from 'react-router-dom';
import { OFICINA } from '../config/oficina';

const Footer = ({ theme = 'dark' }) => {
  const isCafe = theme === 'cafe';

  // Footer simples para o tema Café com Graxa (mantém compatibilidade)
  if (isCafe) {
    return (
      <footer style={{ backgroundColor: '#3b2516', color: '#fbefe0', padding: '60px 20px 30px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
          {[
            { href: OFICINA.instagram, label: '📷 Instagram' },
            { href: OFICINA.tiktok, label: '🎵 TikTok' },
            { href: `https://wa.me/${OFICINA.whatsapp}`, label: '💬 WhatsApp' },
          ].map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fbefe0', backgroundColor: '#d37a54', textDecoration: 'none', padding: '12px 25px', borderRadius: '50px', display: 'inline-block' }}>{l.label}</a>
          ))}
        </div>
        <p style={{ fontSize: '0.9rem', opacity: 0.8, margin: 0 }}><strong>{OFICINA.nome}</strong> © {new Date().getFullYear()} - Todos os direitos reservados.</p>
      </footer>
    );
  }

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const servicos = ['Troca de Óleo', 'Suspensão', 'Alinhamento e Balanceamento', 'Freios', 'Revisão Completa'];

  return (
    <footer className="site-footer">
      <span className="footer-topbar" />
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="nav-logo" style={{ marginBottom: '16px' }}>
            <img src="/logo_kadosh_transparent.png" alt="Kadosh" style={{ height: '40px', borderRadius: 0 }} />
            <span>Kadosh</span>
          </div>
          <p>Excelência em serviços automotivos com honestidade, tecnologia e compromisso com você.</p>
          <div className="footer-social">
            <a href={OFICINA.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
            </a>
            <a href={OFICINA.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16 3c.3 2 1.6 3.6 3.5 4v3c-1.3 0-2.6-.4-3.5-1v6.5A5.5 5.5 0 119.5 10c.3 0 .7 0 1 .1V13a2.6 2.6 0 00-1-.2 2.5 2.5 0 102.5 2.5V3z" /></svg>
            </a>
            <a href={`https://wa.me/${OFICINA.whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Links Rápidos</h4>
          <button onClick={() => scrollTo('inicio')}>Início</button>
          <button onClick={() => scrollTo('servicos')}>Serviços</button>
          <button onClick={() => scrollTo('sobre')}>Sobre Nós</button>
          <button onClick={() => scrollTo('orcamento')}>Orçamento</button>
          <Link to="/revisoes">Pacotes</Link>
        </div>

        <div className="footer-col">
          <h4>Serviços</h4>
          {servicos.map((s) => <button key={s} onClick={() => scrollTo('servicos')}>{s}</button>)}
        </div>

        <div className="footer-col footer-contact">
          <h4>Contato</h4>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFICINA.endereco)}`} target="_blank" rel="noreferrer">
            <span className="fc-ico">📍</span><span>{OFICINA.endereco}</span>
          </a>
          <a href={`https://wa.me/${OFICINA.whatsapp}`} target="_blank" rel="noreferrer">
            <span className="fc-ico">📞</span><span>{OFICINA.telefone}</span>
          </a>
          <a href={OFICINA.instagram} target="_blank" rel="noreferrer">
            <span className="fc-ico">📷</span><span>@kadosh.center</span>
          </a>
        </div>
      </div>

      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} {OFICINA.nome}. Todos os direitos reservados.</span>
        <span>Desenvolvido com paixão por performance.</span>
      </div>

      <style>{`
        .site-footer { position: relative; background: #08080a; padding: 70px 0 0; border-top: 1px solid var(--hairline); }
        .footer-topbar { position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: linear-gradient(90deg, var(--accent-deep), var(--accent-color), transparent); }
        .footer-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1.4fr; gap: 40px; padding-bottom: 50px; }
        .footer-brand p { color: var(--text-muted); font-size: 0.9rem; max-width: 300px; margin-bottom: 18px; }
        .footer-social { display: flex; gap: 10px; }
        .footer-social a {
          display: inline-flex; padding: 10px; border-radius: 10px; color: var(--text-muted);
          border: 1px solid var(--hairline); background: var(--bg-elev); transition: all .25s ease;
        }
        .footer-social a:hover { color: #fff; border-color: var(--accent-color); background: var(--accent-soft); transform: translateY(-2px); }
        .footer-col h4 { font-size: 0.95rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 18px; color: #fff; }
        .footer-col button, .footer-col a {
          display: block; background: none; border: none; color: var(--text-muted); text-align: left;
          font-family: inherit; font-size: 0.9rem; cursor: pointer; padding: 6px 0; transition: color .2s, padding-left .2s;
        }
        .footer-col button:hover, .footer-col a:hover { color: var(--accent-color); padding-left: 5px; }
        .footer-contact a { display: flex; gap: 10px; align-items: flex-start; }
        .footer-contact .fc-ico { flex-shrink: 0; }
        .footer-bottom {
          display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
          padding-top: 24px; padding-bottom: 24px; margin-top: 0;
          border-top: 1px solid var(--hairline); color: var(--text-dim); font-size: 0.82rem;
        }
        @media (max-width: 880px) { .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; } }
        @media (max-width: 520px) { .footer-grid { grid-template-columns: 1fr; } .footer-bottom { justify-content: center; text-align: center; } }
      `}</style>
    </footer>
  );
};

export default Footer;
