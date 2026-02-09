
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
  result?: T;
  error?: {
    code: string;
    description: string;
    referer: string;
    fatal: boolean;
  };
  faultstring?: string;
  faultcode?: string;
}

export interface ConnectionLog {
  id: string;
  timestamp: Date;
  method: string;
  status: 'success' | 'error' | 'pending' | 'system';
  message: string;
}

export interface ServiceDefinition {
  name: string;
  endpoint: string;
  call: string;
  description: string;
  defaultParam?: any;
}

export type LogFilterStatus = 'all' | 'success' | 'error' | 'pending' | 'system';
