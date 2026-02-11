
export interface OmieCredentials {
  appKey: string;
  appSecret: string;
  useProxy?: boolean;
  proxyUrl?: string;
}

// Added missing CredentialProfile interface required for profile management and system maintenance
export interface CredentialProfile {
  id: string;
  name: string;
  appKey: string;
  appSecret: string;
}

export interface OmieApiResponse<T = any> {
  pagina?: number;
  total_de_paginas?: number;
  registros?: number;
  total_de_registros?: number;
  conta_receber_cadastro?: T[];
  conta_pagar_cadastro?: T[];
  clientes_cadastro?: T[];
  vendas_nf_autorizadas?: T[];
  error?: {
    code: string;
    description: string;
    referer: string;
    fatal: boolean;
  };
  faultstring?: string;
  faultcode?: string;
}

export interface ContaFinanceira {
  codigo_lancamento: number;
  data_vencimento: string;
  valor_documento: number;
  status_titulo: string;
  nome_cliente_fornecedor: string;
  codigo_cliente_fornecedor: number;
}

export interface Cliente {
  codigo_cliente_omie: number;
  nome_fantasia: string;
  razao_social: string;
  cnpj_cpf: string;
}

export interface ConnectionLog {
  id: string;
  timestamp: Date;
  method: string;
  status: 'success' | 'error' | 'pending' | 'system';
  message: string;
  details?: string;
}

export interface DateRange {
  start: string;
  end: string;
}
