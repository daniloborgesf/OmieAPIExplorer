
import { ServiceDefinition } from './types';

export const OMIE_SERVICES: ServiceDefinition[] = [
  {
    name: 'Geral - Clientes',
    endpoint: 'https://app.omie.com.br/api/v1/geral/clientes/',
    call: 'ListarClientes',
    description: 'Lista os clientes e fornecedores cadastrados no sistema Omie.',
    defaultParam: [
      {
        pagina: 1,
        registros_por_pagina: 50,
        apenas_importado_api: 'N'
      }
    ]
  },
  {
    name: 'Vendas - Pedidos',
    endpoint: 'https://app.omie.com.br/api/v1/vendas/pedido/',
    call: 'ListarPedidosVenda',
    description: 'Lista pedidos de venda do Omie ERP.',
    defaultParam: [
      {
        pagina: 1,
        registros_por_pagina: 20,
        apenas_importado_api: 'N'
      }
    ]
  }
];

export const THEME_COLORS = {
  petroleumDark: '#000d0f',
  petroleumLight: '#002d35',
  cyanAccent: '#00f2ff',
  success: '#10b981',
  error: '#ef4444',
  textDim: '#64748b'
};
