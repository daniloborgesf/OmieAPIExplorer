
export interface OmieCredentials {
  appKey: string;
  appSecret: string;
  useProxy?: boolean;
  proxyUrl?: string;
}

export interface CredentialProfile extends OmieCredentials {
  id: string;
  name: string;
  createdAt: number;
}

export interface OmieApiResponse<T = any> {
  pagina?: number;
  total_de_paginas?: number;
  registros?: number;
  total_de_registros?: number;
  conta_receber_cadastro?: T[];
  conta_pagar_cadastro?: T[];
  clientes_cadastro?: T[];
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
}

export interface ConnectionLog {
  id: string;
  timestamp: Date;
  method: string;
  status: 'success' | 'error' | 'pending' | 'system';
  message: string;
  details?: string;
}

export interface ServiceDefinition {
  name: string;
  endpoint: string;
  call: string;
  description: string;
  defaultParam?: any;
}
