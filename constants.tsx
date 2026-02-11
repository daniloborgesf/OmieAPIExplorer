
import { ServiceDefinition } from './types';

export const FINANCIAL_SERVICES = {
  RECEIVABLE: {
    name: 'Contas a Receber',
    endpoint: 'https://app.omie.com.br/api/v1/financas/contareceber/',
    call: 'ListarContasReceber',
    defaultParam: {
      pagina: 1,
      registros_por_pagina: 50,
      apenas_importado_api: 'N'
    }
  },
  PAYABLE: {
    name: 'Contas a Pagar',
    endpoint: 'https://app.omie.com.br/api/v1/financas/contapagar/',
    call: 'ListarContasPagar',
    defaultParam: {
      pagina: 1,
      registros_por_pagina: 50,
      apenas_importado_api: 'N'
    }
  },
  CLIENTS: {
    name: 'Clientes',
    endpoint: 'https://app.omie.com.br/api/v1/geral/clientes/',
    call: 'ListarClientes',
    defaultParam: {
      pagina: 1,
      registros_por_pagina: 100,
      apenas_importado_api: 'N'
    }
  }
};

export const THEME_COLORS = {
  petroleumDark: '#000d0f',
  petroleumLight: '#002d35',
  cyanAccent: '#00f2ff',
  success: '#10b981',
  error: '#ef4444',
  textDim: '#64748b'
};
