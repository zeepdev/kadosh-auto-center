import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { OFICINA } from '../../config/oficina';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#222222',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#dc2743',
    paddingBottom: 10,
    marginBottom: 14,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopInfo: {
    width: '60%',
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2743',
    marginBottom: 2,
  },
  shopSub: {
    fontSize: 8,
    color: '#555555',
    lineHeight: 1.3,
  },
  docTitleContainer: {
    width: '40%',
    textAlign: 'right',
  },
  docTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111111',
    textTransform: 'uppercase',
  },
  docSubtitle: {
    fontSize: 8,
    color: '#666666',
    marginTop: 3,
  },
  metaSection: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  metaLabel: {
    fontSize: 7.5,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  summaryCardHighlight: {
    flex: 1.3,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#ca8a04',
    backgroundColor: '#fefce8',
  },
  summaryLabel: {
    fontSize: 7.5,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 3,
    color: '#0f172a',
  },
  summaryValueHighlight: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 3,
    color: '#854d0e',
  },
  table: {
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontWeight: 'bold',
  },
  tableHeaderCell: {
    fontSize: 7.5,
    color: '#334155',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#fafafa',
  },
  cellText: {
    fontSize: 8,
    color: '#1e293b',
  },
  colData: { width: '13%' },
  colOrcamento: { width: '11%' },
  colCliente: { width: '28%' },
  colMecanico: { width: '18%' },
  colMaoObra: { width: '15%', textAlign: 'right' },
  colComissao: { width: '15%', textAlign: 'right' },
  signaturesSection: {
    marginTop: 25,
    paddingTop: 15,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 30,
  },
  signatureBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#64748b',
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  signatureRole: {
    fontSize: 7.5,
    color: '#64748b',
    textAlign: 'center',
  },
  declarationText: {
    fontSize: 7.5,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
  },
});

export const ComissaoPDF = ({ 
  mecanico = null, 
  periodoStr = '', 
  orcamentos = [], 
  totalMaoObra = 0, 
  totalComissao = 0,
  formatCurrency = (val) => `R$ ${(parseFloat(val) || 0).toFixed(2)}`
}) => {
  const isIndividual = mecanico && mecanico.id !== 'todos';
  const dataGeracao = new Date().toLocaleDateString('pt-BR');
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const formatDateStr = (d) => {
    if (!d) return '-';
    const clean = String(d).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return clean;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{OFICINA.nome}</Text>
            <Text style={styles.shopSub}>CNPJ: {OFICINA.cnpj}</Text>
            <Text style={styles.shopSub}>{OFICINA.endereco}</Text>
            <Text style={styles.shopSub}>Telefone / WhatsApp: {OFICINA.telefone}</Text>
          </View>
          <View style={styles.docTitleContainer}>
            <Text style={styles.docTitle}>Relatório de Comissões</Text>
            <Text style={styles.docSubtitle}>Fechamento Mensal de Produtividade</Text>
            <Text style={styles.docSubtitle}>Emissão: {dataGeracao} às {horaGeracao}</Text>
          </View>
        </View>

        {/* Informações do Mecânico / Período */}
        <View style={styles.metaSection}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Mecânico / Beneficiário:</Text>
            <Text style={styles.metaValue}>{isIndividual ? mecanico.nome : 'Todos os Mecânicos'}</Text>
            {isIndividual && mecanico.especialidade && (
              <Text style={{ fontSize: 8, color: '#64748b' }}>Especialidade: {mecanico.especialidade}</Text>
            )}
          </View>

          {isIndividual && (
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Chave PIX / CPF:</Text>
              <Text style={styles.metaValue}>{mecanico.cpf_pix || mecanico.whatsapp || 'Não informado'}</Text>
              {mecanico.whatsapp && (
                <Text style={{ fontSize: 8, color: '#64748b' }}>Contato: {mecanico.whatsapp}</Text>
              )}
            </View>
          )}

          <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.metaLabel}>Período de Apuração:</Text>
            <Text style={styles.metaValue}>{periodoStr}</Text>
            <Text style={{ fontSize: 8, color: '#64748b' }}>Status: Serviços Pagos / Baixados</Text>
          </View>
        </View>

        {/* Resumo Financeiro */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total de Serviços Pagos</Text>
            <Text style={styles.summaryValue}>{orcamentos.length} serviço(s)</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Mão de Obra</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalMaoObra)}</Text>
          </View>

          <View style={styles.summaryCardHighlight}>
            <Text style={[styles.summaryLabel, { color: '#854d0e' }]}>Total da Comissão a Pagar</Text>
            <Text style={styles.summaryValueHighlight}>{formatCurrency(totalComissao)}</Text>
          </View>
        </View>

        {/* Tabela de Serviços */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colData]}>Data</Text>
            <Text style={[styles.tableHeaderCell, styles.colOrcamento]}>Orçamento</Text>
            <Text style={[styles.tableHeaderCell, styles.colCliente]}>Cliente / Veículo</Text>
            <Text style={[styles.tableHeaderCell, styles.colMecanico]}>Mecânico / Regra</Text>
            <Text style={[styles.tableHeaderCell, styles.colMaoObra]}>Mão de Obra</Text>
            <Text style={[styles.tableHeaderCell, styles.colComissao]}>Comissão</Text>
          </View>

          {orcamentos.length === 0 ? (
            <View style={{ padding: 15, alignItems: 'center' }}>
              <Text style={{ color: '#94a3b8', fontSize: 8.5 }}>Nenhum serviço com comissão localizado neste período.</Text>
            </View>
          ) : (
            orcamentos.map((item, idx) => {
              const isEven = idx % 2 === 0;
              const comissaoItem = parseFloat(item._valorComissaoCalculada != null ? item._valorComissaoCalculada : item.valor_comissao) || 0;
              const regraStr = item._regraComissao || (item.comissao_tipo === 'porcentagem' ? `${item.comissao_taxa || 0}%` : 'Fixo');
              const nomeMecanicoExibicao = item._nomeMecanicoCalculado || item.mecanico_nome || (isIndividual ? mecanico.nome : 'Mecânico');

              return (
                <View key={idx} style={[styles.tableRow, isEven && styles.tableRowEven]}>
                  <Text style={[styles.cellText, styles.colData]}>{formatDateStr(item.data_pagamento)}</Text>
                  <Text style={[styles.cellText, styles.colOrcamento, { fontWeight: 'bold' }]}>#{item.id}</Text>
                  <View style={styles.colCliente}>
                    <Text style={[styles.cellText, { fontWeight: 'bold' }]}>{item.nome || 'Cliente Balcão'}</Text>
                    <Text style={[styles.cellText, { fontSize: 7, color: '#64748b' }]}>{item.placa || 'Sem placa'}</Text>
                  </View>
                  <View style={styles.colMecanico}>
                    <Text style={[styles.cellText, { fontSize: 7.5 }]}>{nomeMecanicoExibicao}</Text>
                    <Text style={[styles.cellText, { fontSize: 6.5, color: '#64748b' }]}>({regraStr})</Text>
                  </View>
                  <Text style={[styles.cellText, styles.colMaoObra]}>{formatCurrency(item.valor_mao_obra)}</Text>
                  <Text style={[styles.cellText, styles.colComissao, { fontWeight: 'bold', color: '#b45309' }]}>
                    {formatCurrency(comissaoItem)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Termo de Quitação e Assinaturas */}
        <Text style={styles.declarationText}>
          Declaro para os devidos fins que conferi a relação de serviços acima discriminada e recebi o valor integral
          referente à comissão apurada no período especificado.
        </Text>

        <View style={styles.signaturesSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>
              {isIndividual ? mecanico.nome : 'Mecânico / Beneficiário'}
            </Text>
            <Text style={styles.signatureRole}>
              {isIndividual && mecanico.cpf_pix ? `CPF/PIX: ${mecanico.cpf_pix}` : 'Assinatura do Mecânico'}
            </Text>
          </View>

          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{OFICINA.nome}</Text>
            <Text style={styles.signatureRole}>Gerência / Visto Financeiro</Text>
          </View>
        </View>

        {/* Rodapé do Documento */}
        <View style={styles.footer} fixed>
          <Text>{OFICINA.nome} — Sistema de Gestão Interno</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
};

export default ComissaoPDF;
