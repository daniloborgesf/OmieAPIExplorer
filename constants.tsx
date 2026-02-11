
import { DateRange } from './types';

export const FINANCIAL_SERVICES = {
  RECEIVABLE: {
    name: 'Contas a Receber',
    endpoint: 'https://app.omie.com.br/api/v1/financas/contareceber/',
    call: 'ListarContasReceber',
    getParam: (page: number, range: DateRange) => ({
      pagina: page,
      registros_por_pagina: 50,
      apenas_importado_api: 'N',
      filtrar_por_data_de: range.start,
      filtrar_por_data_ate: range.end
    })
  },
  PAYABLE: {
    name: 'Contas a Pagar',
    endpoint: 'https://app.omie.com.br/api/v1/financas/contapagar/',
    call: 'ListarContasPagar',
    getParam: (page: number, range: DateRange) => ({
      pagina: page,
      registros_por_pagina: 50,
      apenas_importado_api: 'N',
      dtVencDe: range.start,
      dtVencAte: range.end
    })
  },
  CLIENTS: {
    name: 'Clientes',
    endpoint: 'https://app.omie.com.br/api/v1/geral/clientes/',
    call: 'ListarClientes',
    getParam: (page: number) => ({
      pagina: page,
      registros_por_pagina: 100,
      apenas_importado_api: 'N'
    })
  },
  SALES: {
    name: 'Faturamento',
    endpoint: 'https://app.omie.com.br/api/v1/produtos/nfconsultar/',
    call: 'ListarNFAutorizadas',
    getParam: (page: number, range: DateRange) => ({
      pagina: page,
      registros_por_pagina: 50,
      dRegInicial: range.start,
      dRegFinal: range.end
    })
  }
};
