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

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = `/#${id}`;
    }
  };

  const navLinks = [
    { name: 'Início', id: 'inicio', action: () => { setMobileMenuOpen(false); if (isHome) { window.scrollTo({ top: 0, behavior: 'smooth' }); } else { navigate('/'); } } },
    { name: 'Serviços', id: 'servicos', action: () => scrollTo('servicos') },
    { name: 'Galeria', id: 'galeria', action: () => scrollTo('galeria') },
    { name: 'Orçamento', id: 'orcamento', action: () => scrollTo('orcamento') },
    { name: 'Contato', id: 'contato', action: () => { setMobileMenuOpen(false); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); } },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="container nav-container">
        <Link to="/" className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/logo_kadosh_transparent.png" alt="Kadosh" style={{ borderRadius: 0, height: '36px', marginTop: '4px' }} />
          <span>Kadosh</span>
        </Link>

        {/* Desktop Links */}
        <div className="nav-links">
          {navLinks.map((link) => (
            <button key={link.id} onClick={link.action} className="nav-link-btn">
              {link.name}
            </button>
          ))}
          <Link to="/cafe-com-graxa" className="nav-link-btn" style={{ color: '#d37a54', fontWeight: 'bold' }}>
            ☕ Café com Graxa
          </Link>
          <Link to="/revisoes" className="nav-link-btn" style={{ color: '#4ade80', fontWeight: 'bold' }}>
            🛠️ Revisões
          </Link>
          <Link to={user ? '/cliente' : '/login'} className="btn nav-cta">
            {user ? 'Minha Área' : 'Área do Cliente'}
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}></span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
        {navLinks.map((link) => (
          <button key={link.id} onClick={link.action} className="mobile-link">
            {link.name}
          </button>
        ))}
        <Link to="/cafe-com-graxa" className="mobile-link" onClick={() => setMobileMenuOpen(false)} style={{ color: '#d37a54', fontWeight: 'bold' }}>
          ☕ Café com Graxa
        </Link>
        <Link to="/revisoes" className="mobile-link" onClick={() => setMobileMenuOpen(false)} style={{ color: '#4ade80', fontWeight: 'bold' }}>
          🛠️ Revisões
        </Link>
        <Link to={user ? '/cliente' : '/login'} className="btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setMobileMenuOpen(false)}>
          {user ? 'Minha Área' : 'Área do Cliente'}
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
