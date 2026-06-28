import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.location.href = `/#${id}`;
  };

  const navLinks = [
    { name: 'Início', id: 'inicio', action: () => { setMobileMenuOpen(false); if (isHome) window.scrollTo({ top: 0, behavior: 'smooth' }); else navigate('/'); } },
    { name: 'Serviços', id: 'servicos', action: () => scrollTo('servicos') },
    { name: 'Galeria', id: 'galeria', action: () => scrollTo('galeria') },
    { name: 'Orçamento', id: 'orcamento', action: () => scrollTo('orcamento') },
    { name: 'Contato', id: 'contato', action: () => { setMobileMenuOpen(false); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); } },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="container nav-container">
        <Link to="/" className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/logo_kadosh_transparent.png" alt="Kadosh" style={{ borderRadius: 0, height: '34px', position: 'relative', top: '7px' }} />
          <span>Kadosh</span>
        </Link>

        {/* Desktop */}
        <div className="nav-links">
          <div className="nav-group">
            {navLinks.map((link) => (
              <button key={link.id} onClick={link.action} className="nav-link-btn">{link.name}</button>
            ))}
          </div>

          <span className="nav-divider" />

          <div className="nav-pills">
            <Link to="/cafe-com-graxa" className="nav-pill pill-cafe">☕ Café com Graxa</Link>
            <Link to="/revisoes" className="nav-pill pill-pacotes">📦 Pacotes</Link>
          </div>

          <Link to={user ? '/cliente' : '/login'} className="btn nav-cta">
            {user ? 'Minha Área' : 'Área do Cliente'}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}></span>
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
        {navLinks.map((link) => (
          <button key={link.id} onClick={link.action} className="mobile-link">{link.name}</button>
        ))}
        <Link to="/cafe-com-graxa" className="mobile-link" onClick={() => setMobileMenuOpen(false)} style={{ color: '#d37a54' }}>☕ Café com Graxa</Link>
        <Link to="/revisoes" className="mobile-link" onClick={() => setMobileMenuOpen(false)} style={{ color: '#4ade80' }}>📦 Pacotes</Link>
        <Link to={user ? '/cliente' : '/login'} className="btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setMobileMenuOpen(false)}>
          {user ? 'Minha Área' : 'Área do Cliente'}
        </Link>
      </div>

      <style>{`
        .nav-links { display: flex; align-items: center; gap: 20px; }
        .nav-group { display: flex; align-items: center; gap: 22px; }
        .nav-divider { width: 1px; height: 22px; background: var(--hairline); }
        .nav-pills { display: flex; align-items: center; gap: 10px; }
        .nav-pill {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 0.78rem; font-weight: 700; letter-spacing: .3px;
          padding: 7px 13px; border-radius: 30px; white-space: nowrap;
          border: 1px solid var(--hairline); background: var(--bg-elev);
          transition: all .22s ease;
        }
        .pill-cafe { color: #e2a07a; }
        .pill-cafe:hover { border-color: #d37a54; background: rgba(211,122,84,0.12); transform: translateY(-1px); }
        .pill-pacotes { color: #6ee79b; }
        .pill-pacotes:hover { border-color: #4ade80; background: rgba(74,222,128,0.12); transform: translateY(-1px); }
        @media (max-width: 1120px) { .nav-links { display: none; } .mobile-toggle { display: block; } }
      `}</style>
    </nav>
  );
};

export default Navbar;
