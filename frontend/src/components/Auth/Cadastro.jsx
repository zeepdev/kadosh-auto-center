import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { consultarPlaca } from '../../lib/placaApi';
import { validarCPF } from '../../lib/cpf';
import { Link, useNavigate } from 'react-router-dom';

const Cadastro = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    senha: '',
    whatsapp: ''
  });

  const [veiculo, setVeiculo] = useState({
    placa: '',
    marca: '',
    modelo: '',
    ano: ''
  });

  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);

  const handleClienteChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVeiculoChange = (e) => {
    setVeiculo({ ...veiculo, [e.target.name]: e.target.value.toUpperCase() });
  };

  const buscarDadosPlaca = async () => {
    if (veiculo.placa.length < 7) return;
    setBuscandoPlaca(true);
    try {
      const dados = await consultarPlaca(veiculo.placa);
      setVeiculo({
        ...veiculo,
        marca: dados.marca,
        modelo: dados.modelo,
        ano: dados.ano
      });
    } catch (err) {
      console.error(err);
      alert(err);
    } finally {
      setBuscandoPlaca(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    if (!validarCPF(formData.cpf)) {
      setErrorMessage('CPF inválido. Por favor, verifique o número digitado.');
      setStatus('error');
      return;
    }

    try {
      // 1. Criar o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha
      });

      if (authError) throw new Error(authError.message);

      const userId = authData.user.id;

      // 2. Atualizar dados do cliente (a row foi criada pelo trigger handle_new_user no Supabase)
      const { error: clienteError } = await supabase
        .from('clientes')
        .update({
          nome: formData.nome,
          cpf: formData.cpf.replace(/\D/g, ''),
          whatsapp: formData.whatsapp.replace(/\D/g, '')
        })
        .eq('id', userId);

      if (clienteError) throw new Error("Erro ao salvar dados do cliente: " + clienteError.message);

      // 3. Salvar o veículo principal na tabela veiculos
      const { error: veiculoError } = await supabase
        .from('veiculos')
        .insert([{
          cliente_id: userId,
          placa: veiculo.placa.toUpperCase(),
          marca: veiculo.marca,
          modelo: veiculo.modelo,
          ano: veiculo.ano,
          is_principal: true
        }]);

      if (veiculoError) throw new Error("Erro ao salvar veículo: " + veiculoError.message);

      setStatus('success');
      setTimeout(() => {
        navigate('/cliente');
      }, 2000);

    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0505', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
      <form onSubmit={handleSubmit} className="glass" style={{ padding: '40px', maxWidth: '600px', width: '100%', borderRadius: '12px' }}>
        <h2 style={{ color: '#dc2743', marginBottom: '10px', textAlign: 'center' }}>Criar sua Conta</h2>
        <p style={{ color: '#aaa', marginBottom: '30px', textAlign: 'center' }}>Cadastre-se e tenha controle total sobre os serviços do seu veículo.</p>
        
        <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>Dados Pessoais</h3>
        <div className="form-group">
          <label>Nome Completo</label>
          <input type="text" name="nome" required value={formData.nome} onChange={handleClienteChange} />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>CPF</label>
            <input type="text" name="cpf" required value={formData.cpf} onChange={handleClienteChange} placeholder="000.000.000-00" />
          </div>
          <div className="form-group">
            <label>WhatsApp</label>
            <input type="text" name="whatsapp" required value={formData.whatsapp} onChange={handleClienteChange} placeholder="(00) 00000-0000" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" name="email" required value={formData.email} onChange={handleClienteChange} />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" name="senha" required minLength="6" value={formData.senha} onChange={handleClienteChange} />
          </div>
        </div>

        <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px', marginTop: '30px' }}>Veículo Principal</h3>
        
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label>Placa do Veículo</label>
            <input type="text" name="placa" required value={veiculo.placa} onChange={handleVeiculoChange} placeholder="AAA-0A00" maxLength="8" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <button type="button" onClick={buscarDadosPlaca} className="btn" style={{ width: '100%', background: '#333' }} disabled={buscandoPlaca}>
              {buscandoPlaca ? 'Buscando...' : 'Consultar Placa'}
            </button>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Marca</label>
            <input type="text" name="marca" required value={veiculo.marca} onChange={handleVeiculoChange} />
          </div>
          <div className="form-group">
            <label>Modelo</label>
            <input type="text" name="modelo" required value={veiculo.modelo} onChange={handleVeiculoChange} />
          </div>
          <div className="form-group">
            <label>Ano</label>
            <input type="text" name="ano" value={veiculo.ano} onChange={handleVeiculoChange} />
          </div>
        </div>

        {errorMessage && <div style={{ color: '#f87171', marginTop: '20px', fontWeight: 'bold' }}>⚠️ {errorMessage}</div>}
        
        {status === 'success' && <div style={{ color: '#4ade80', marginTop: '20px', textAlign: 'center' }}>Cadastro realizado com sucesso! Redirecionando...</div>}

        <button type="submit" className="btn" style={{ width: '100%', marginTop: '30px' }} disabled={status === 'loading'}>
          {status === 'loading' ? 'Criando Conta...' : 'Finalizar Cadastro'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#aaa' }}>
          Já possui conta? <Link to="/login" style={{ color: '#dc2743', fontWeight: 'bold' }}>Faça Login</Link>
        </p>
      </form>
    </div>
  );
};

export default Cadastro;
