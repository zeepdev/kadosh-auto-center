import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#e10600',
    paddingBottom: 15,
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e10600',
    letterSpacing: 1,
  },
  logoSubtext: {
    fontSize: 8,
    color: '#666666',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  docTitleContainer: {
    textAlign: 'right',
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  docSubtitle: {
    fontSize: 8,
    color: '#666666',
    marginTop: 4,
  },
  metaSection: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  metaColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  metaLabel: {
    fontSize: 8,
    color: '#666666',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111111',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111111',
    textTransform: 'uppercase',
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e10600',
    paddingLeft: 6,
  },
  table: {
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    padding: 8,
  },
  colDesc: {
    flex: 2,
  },
  colConta: {
    flex: 1,
    textAlign: 'center',
  },
  colValor: {
    flex: 1,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  rowTotal: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 8,
    fontWeight: 'bold',
  },
  totalLabel: {
    flex: 3,
    textAlign: 'right',
    color: '#495057',
  },
  totalValue: {
    flex: 1,
    textAlign: 'right',
    color: '#111111',
  },
  inflowColor: {
    color: '#2b8a3e',
  },
  outflowColor: {
    color: '#c92a2a',
  },
  positionsSection: {
    marginTop: 10,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#fafafa',
  },
  posRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  posLabel: {
    color: '#495057',
  },
  posValue: {
    fontWeight: 'bold',
  },
  summaryHeader: {
    backgroundColor: '#e10600',
    color: '#ffffff',
    padding: 10,
    borderRadius: 4,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  summaryHeaderText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  notesSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#b45309',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notesText: {
    color: '#78350f',
    fontSize: 9,
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#adb5bd',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 10,
  }
});

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const FluxoCaixaPDF = ({ data }) => {
  const entradasList = data.entradas || [];
  const saidasList = data.saidas || [];
  
  const totalEntradas = entradasList.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
  const totalSaidas = saidasList.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
  
  const caixaInicial = parseFloat(data.caixa_inicial) || 0;
  const fundoCaixa = parseFloat(data.fundo_caixa) || 0;
  const dinheiroEmpresa = parseFloat(data.dinheiro_empresa) || 0;
  const fundoReserva = parseFloat(data.fundo_reserva) || 0;
  
  const saldoFinalCalculado = caixaInicial + totalEntradas - totalSaidas;
  const saldoFisicoReal = fundoCaixa + dinheiroEmpresa + fundoReserva;
  const diferencaConciliacao = saldoFisicoReal - saldoFinalCalculado;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>KADOSH</Text>
            <Text style={styles.logoSubtext}>Auto Center</Text>
          </View>
          <View style={styles.docTitleContainer}>
            <Text style={styles.docTitle}>Fechamento de Caixa</Text>
            <Text style={styles.docSubtitle}>Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</Text>
          </View>
        </View>

        {/* Metadados / Resumos Iniciais */}
        <View style={styles.metaSection}>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Data de Referência</Text>
            <Text style={styles.metaValue}>{formatDate(data.data)}</Text>
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Caixa / Saldo Inicial</Text>
            <Text style={styles.metaValue}>{formatCurrency(data.caixa_inicial)}</Text>
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Total de Entradas</Text>
            <Text style={[styles.metaValue, styles.inflowColor]}>+ {formatCurrency(totalEntradas)}</Text>
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Total de Saídas</Text>
            <Text style={[styles.metaValue, styles.outflowColor]}>- {formatCurrency(totalSaidas)}</Text>
          </View>
        </View>

        {/* Tabela de Entradas */}
        <Text style={styles.sectionTitle}>Entradas de Caixa</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Descrição</Text>
            <Text style={styles.colConta}>Conta / Canal</Text>
            <Text style={styles.colValor}>Valor</Text>
          </View>
          {entradasList.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ flex: 1, textAlign: 'center', color: '#868e96' }}>Nenhuma entrada registrada.</Text>
            </View>
          ) : (
            entradasList.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colDesc}>{item.descricao || 'Sem descrição'}</Text>
                <Text style={styles.colConta}>{item.conta || 'N/A'}</Text>
                <Text style={[styles.colValor, styles.inflowColor]}>{formatCurrency(item.valor)}</Text>
              </View>
            ))
          )}
          <View style={styles.rowTotal}>
            <Text style={styles.totalLabel}>Subtotal de Entradas</Text>
            <Text style={[styles.totalValue, styles.inflowColor]}>{formatCurrency(totalEntradas)}</Text>
          </View>
        </View>

        {/* Tabela de Saídas */}
        <Text style={styles.sectionTitle}>Saídas de Caixa</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Descrição</Text>
            <Text style={styles.colConta}>Conta / Origem</Text>
            <Text style={styles.colValor}>Valor</Text>
          </View>
          {saidasList.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ flex: 1, textAlign: 'center', color: '#868e96' }}>Nenhuma saída registrada.</Text>
            </View>
          ) : (
            saidasList.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colDesc}>{item.descricao || 'Sem descrição'}</Text>
                <Text style={styles.colConta}>{item.conta || 'N/A'}</Text>
                <Text style={[styles.colValor, styles.outflowColor]}>-{formatCurrency(item.valor)}</Text>
              </View>
            ))
          )}
          <View style={styles.rowTotal}>
            <Text style={styles.totalLabel}>Subtotal de Saídas</Text>
            <Text style={[styles.totalValue, styles.outflowColor]}>-{formatCurrency(totalSaidas)}</Text>
          </View>
        </View>

        {/* Saldos Físicos e Conciliação */}
        <Text style={styles.sectionTitle}>Posições Financeiras Finais</Text>
        <View style={styles.positionsSection}>
          <View style={styles.posRow}>
            <Text style={styles.posLabel}>Fundo de Caixa (Troco em mãos)</Text>
            <Text style={styles.posValue}>{formatCurrency(data.fundo_caixa)}</Text>
          </View>
          <View style={styles.posRow}>
            <Text style={styles.posLabel}>Dinheiro na Empresa (Em cofre)</Text>
            <Text style={styles.posValue}>{formatCurrency(data.dinheiro_empresa)}</Text>
          </View>
          <View style={styles.posRow}>
            <Text style={styles.posLabel}>Fundo de Reserva (Contas bancárias/outros)</Text>
            <Text style={styles.posValue}>{formatCurrency(data.fundo_reserva)}</Text>
          </View>
          <View style={[styles.posRow, { borderBottomWidth: 0, paddingTop: 10 }]}>
            <Text style={[styles.posLabel, { fontWeight: 'bold', color: '#111111' }]}>Saldo Físico Real Declarado</Text>
            <Text style={[styles.posValue, { fontSize: 11, color: '#111111' }]}>{formatCurrency(saldoFisicoReal)}</Text>
          </View>
        </View>

        {/* Resumo Consolidado com Status de Conciliação */}
        <View style={[styles.summaryHeader, { backgroundColor: Math.abs(diferencaConciliacao) < 0.01 ? '#2b8a3e' : '#e10600' }]}>
          <Text style={styles.summaryHeaderText}>SALDO CONSOLIDADO DO DIA</Text>
          <Text style={styles.summaryHeaderText}>{formatCurrency(saldoFisicoReal)}</Text>
        </View>

        {Math.abs(diferencaConciliacao) >= 0.01 && (
          <View style={{ marginTop: 10, padding: 10, borderRadius: 4, borderWidth: 1, borderColor: '#f8d7da', backgroundColor: '#f8d7da', color: '#721c24' }}>
            <Text style={{ fontWeight: 'bold' }}>
              ⚠️ Divergência de Conciliação: {formatCurrency(diferencaConciliacao)}
            </Text>
            <Text style={{ fontSize: 8, marginTop: 2 }}>
              O saldo físico real declarado difere do saldo final calculado (Caixa Inicial + Entradas - Saídas = {formatCurrency(saldoFinalCalculado)}).
            </Text>
          </View>
        )}

        {/* Observações */}
        {data.observacoes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Observações / Anotações do Dia</Text>
            <Text style={styles.notesText}>{data.observacoes}</Text>
          </View>
        )}

        {/* Rodapé */}
        <Text style={styles.footer}>Kadosh Auto Center - Confiança e Qualidade em Serviços Automotivos</Text>

      </Page>
    </Document>
  );
};
