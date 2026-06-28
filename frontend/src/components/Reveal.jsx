import React, { useEffect, useRef, useState } from 'react';

/**
 * Reveal: anima a entrada do conteudo quando ele aparece na tela.
 * Leve, sem dependencias (IntersectionObserver). Respeita prefers-reduced-motion via CSS.
 *
 * props:
 *  - as: tag/elemento (default 'div')
 *  - dir: 'up' | 'left' | 'right'
 *  - delay: atraso em ms para efeito escalonado
 */
const Reveal = ({ as: Tag = 'div', dir = 'up', delay = 0, className = '', style, children, ...rest }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const dirClass = dir === 'left' ? 'reveal-left' : dir === 'right' ? 'reveal-right' : '';

  return (
    <Tag
      ref={ref}
      className={`reveal ${dirClass} ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
