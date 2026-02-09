
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

  const finalUrl = credentials.useProxy && credentials.proxyUrl 
    ? `${credentials.proxyUrl.replace(/\/$/, '')}/${endpoint}`
    : endpoint;

  try {
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest' // Importante para alguns proxies
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type");
    
    if (response.status === 403 && !contentType?.includes("application/json")) {
      return {
        error: {
          code: "403",
          description: "Acesso Negado pelo Proxy. Você precisa clicar em 'Ativar Acesso Temporário' nas configurações para liberar o tráfego do navegador.",
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
          description: `Resposta do Servidor: ${textError.substring(0, 150)}...`,
          referer: 'HTTP_PROTOCOL',
          fatal: response.status >= 500
        }
      };
    }
  } catch (error: any) {
    return {
      error: {
        code: 'NETWORK_ERROR',
        description: credentials.useProxy 
          ? `Falha na conexão via Proxy: ${error.message}. Verifique se o serviço de proxy está online.` 
          : `CORS detectado. Ative o 'Modo de Compatibilidade (Proxy)' nas configurações.`,
        referer: 'BROWSER_CORS',
        fatal: true
      }
    };
  }
};
