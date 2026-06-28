import React from 'react';
import { OFICINA } from '../config/oficina';

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

const CalIcon = () => (
  <svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="11" width="32" height="29" rx="3" /><path d="M8 19h32M16 8v6M32 8v6" />
    <path d="M15 26h4M22 26h4M29 26h4M15 32h4M22 32h4" />
  </svg>
);

const WppIcon = ({ size = 26 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

export const OrcamentoBand = () => (
  <section className="orc-band">
    <span className="orc-diag od1" />
    <span className="orc-diag od2" />
    <div className="container orc-inner">
      <div className="orc-left">
        <span className="orc-ico"><CalIcon /></span>
        <div>
          <h3>Faça seu orçamento</h3>
          <p>Mais praticidade para cuidar do seu carro, sem complicação.</p>
        </div>
      </div>
      <button className="orc-btn" onClick={() => scrollTo('orcamento')}>Solicitar Agora &nbsp;›</button>
    </div>

    <style>{`
      .orc-band {
        position: relative; overflow: hidden; padding: 46px 0;
        background: linear-gradient(100deg, var(--accent-deep) 0%, var(--accent-color) 60%, #ff3b30 100%);
      }
      .orc-band::before {
        content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.18;
        background-image: repeating-linear-gradient(115deg, #000 0 2px, transparent 2px 22px);
      }
      .orc-diag { position: absolute; top: 0; height: 100%; width: 60px; background: rgba(0,0,0,0.18); transform: skewX(-18deg); }
      .orc-diag.od1 { right: 8%; } .orc-diag.od2 { right: 4%; width: 26px; background: rgba(0,0,0,0.12); }
      .orc-inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
      .orc-left { display: flex; align-items: center; gap: 20px; }
      .orc-ico { color: #fff; }
      .orc-left h3 { color: #fff; font-size: 1.5rem; text-transform: uppercase; }
      .orc-left p { color: rgba(255,255,255,0.88); margin-top: 4px; }
      .orc-btn {
        background: #0a0a0c; color: #fff; border: none; padding: 16px 30px; border-radius: 8px;
        font-family: 'Archivo', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
        cursor: pointer; transition: transform .2s ease, background .2s ease;
      }
      .orc-btn:hover { transform: translateY(-2px); background: #16161a; }
      @media (max-width: 640px) { .orc-inner { justify-content: center; text-align: center; } .orc-left { flex-direction: column; text-align: center; } }
    `}</style>
  </section>
);

export const WhatsAppBand = () => (
  <section className="wpp-band">
    <span className="wpp-diag" />
    <div className="container wpp-inner">
      <div className="wpp-left">
        <span className="wpp-ico"><WppIcon size={30} /></span>
        <div>
          <h3>Dúvidas ou orçamentos?</h3>
          <p>Fale com a gente pelo WhatsApp.</p>
        </div>
      </div>
      <a className="wpp-btn" href={`https://wa.me/${OFICINA.whatsapp}`} target="_blank" rel="noreferrer">
        <WppIcon size={22} /> {OFICINA.telefone}
      </a>
    </div>

    <style>{`
      .wpp-band { position: relative; overflow: hidden; padding: 40px 0; background: var(--bg-elev); border-top: 1px solid var(--hairline); }
      .wpp-diag { position: absolute; top: 0; right: 6%; height: 100%; width: 50px; background: linear-gradient(180deg, var(--accent-color), var(--accent-deep)); transform: skewX(-18deg); opacity: 0.5; }
      .wpp-inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
      .wpp-left { display: flex; align-items: center; gap: 18px; }
      .wpp-ico { color: var(--accent-color); display: inline-flex; padding: 12px; border-radius: 12px; background: var(--accent-soft); border: 1px solid rgba(225,6,0,0.25); }
      .wpp-left h3 { font-size: 1.35rem; text-transform: uppercase; }
      .wpp-left p { color: var(--text-muted); margin-top: 3px; }
      .wpp-btn {
        display: inline-flex; align-items: center; gap: 12px; background: var(--accent-color); color: #fff;
        padding: 14px 26px; border-radius: 8px; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 1.15rem;
        letter-spacing: .5px; transition: transform .2s ease, background .2s ease, box-shadow .3s ease;
        box-shadow: 0 8px 30px -10px var(--accent-glow);
      }
      .wpp-btn:hover { transform: translateY(-2px); background: var(--accent-hover); box-shadow: 0 14px 34px -8px var(--accent-glow); }
      @media (max-width: 640px) { .wpp-inner { justify-content: center; text-align: center; } .wpp-left { flex-direction: column; text-align: center; } }
    `}</style>
  </section>
);
