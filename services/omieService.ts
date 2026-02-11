
import { OmieCredentials, OmieApiResponse } from '../types';

export const sanitizeData = (data: any): any => {
  if (Array.isArray(data)) {
    return data
      .map(v => sanitizeData(v))
      .filter(v => v !== null && v !== undefined);
  }

  if (typeof data === 'object' && data !== null) {
    const cleaned = Object.entries(data).reduce((acc, [key, value]) => {
      const cleanedValue = sanitizeData(value);
      if (cleanedValue !== null && cleanedValue !== undefined) {
        acc[key] = cleanedValue;
      }
      return acc;
    }, {} as any);
    
    return cleaned;
  }

  return data;
};

export const callOmieApi = async (
  credentials: OmieCredentials,
  endpoint: string,
  call: string,
  param: any
): Promise<OmieApiResponse> => {
  const payload = {
    call,
    app_key: credentials.appKey.trim(),
    app_secret: credentials.appSecret.trim(),
    param: sanitizeData(param)
  };

  // Garante que a URL final utilize o Proxy se configurado (Habilitado por padrão para evitar CORS)
  const finalUrl = credentials.useProxy && credentials.proxyUrl 
    ? `${credentials.proxyUrl.replace(/\/$/, '')}/${endpoint}`
    : endpoint;

  try {
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest' 
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type");
    
    // Tratamento específico para autorização de Proxy Heroku (cors-anywhere)
    if (response.status === 403 && !contentType?.includes("application/json")) {
      return {
        error: {
          code: "PROXY_AUTH_REQUIRED",
          description: "O túnel CORS requer autorização. Clique no link 'Ativar Acesso Temporário' nas configurações.",
          referer: 'PROXY_BLOCK',
          fatal: true
        }
      };
    }

    if (contentType && contentType.indexOf("application/json") !== -1) {
      return await response.json();
    } else {
      const textError = await response.text();
      return {
        error: {
          code: response.status.toString(),
          description: `Resposta inconsistente: ${textError.substring(0, 100)}...`,
          referer: 'HTTP_PROTOCOL',
          fatal: response.status >= 500
        }
      };
    }
  } catch (error: any) {
    // Retorno de erro capturável pelo App.tsx para ativação automática de Proxy
    return {
      error: {
        code: 'NETWORK_ERROR',
        description: error.message || 'Falha na comunicação de rede.',
        referer: 'BROWSER_CORS',
        fatal: true
      }
    };
  }
};
