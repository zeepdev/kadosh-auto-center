import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('⚠️ [ErrorBoundary] Erro capturado no componente:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem('kadosh_fluxo_caixa_draft');
      localStorage.removeItem('kadosh_fluxo_caixa');
      console.log('✅ Cache local do Fluxo de Caixa limpo com sucesso.');
    } catch (e) {
      console.warn('Erro ao limpar cache local:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const moduleName = this.props.moduleName || 'esta seção';

      return (
        <div 
          className="glass" 
          style={{
            padding: '40px 30px',
            margin: '20px auto',
            maxWidth: '700px',
            border: '1px solid #ef4444',
            background: 'rgba(239, 68, 68, 0.05)',
            borderRadius: '16px',
            textAlign: 'center',
            color: '#fff'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚠️</div>
          <h3 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '1.4rem' }}>
            Não foi possível carregar {moduleName}
          </h3>
          <p style={{ color: '#aaa', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
            Ocorreu uma falha temporária durante a leitura ou exibição dos dados. Você pode tentar recarregar ou limpar os dados salvos em cache local.
          </p>

          {this.state.error && (
            <div 
              style={{
                background: '#0a0a0e',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.78rem',
                color: '#f87171',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '25px',
                maxHeight: '120px'
              }}
            >
              {this.state.error.toString()}
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReset}
              className="btn"
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              🔄 Tentar Novamente
            </button>
            <button
              onClick={this.handleClearCacheAndReload}
              className="btn"
              style={{
                background: '#ef4444',
                color: '#fff',
                fontWeight: 'bold',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              🧹 Limpar Cache Local & Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
