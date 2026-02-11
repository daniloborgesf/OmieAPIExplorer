
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
  if (!credentials.appKey || !credentials.appSecret) {
    throw new Error("Credenciais Omie ausentes");
  }

  const payload = {
    call,
    app_key: credentials.appKey.trim(),
    app_secret: credentials.appSecret.trim(),
    param: sanitizeData(param)
  };

  // Construção de URL ultra-segura para evitar "Invalid URL"
  let finalUrl = endpoint;
  if (credentials.useProxy && credentials.proxyUrl) {
    const baseUrl = credentials.proxyUrl.endsWith('/') 
      ? credentials.proxyUrl.slice(0, -1) 
      : credentials.proxyUrl;
    
    // Se o proxyUrl for inválido, o browser lançará erro aqui, tratamos no catch
    finalUrl = `${baseUrl}/${endpoint}`;
  }

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
    
    if (response.status === 403 && !contentType?.includes("application/json")) {
      return {
        error: {
          code: "PROXY_AUTH_REQUIRED",
          description: "O túnel CORS requer autorização. Tente acessar a URL do proxy diretamente uma vez para liberar.",
          referer: 'PROXY_BLOCK',
          fatal: true
        }
      };
    }

    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      const textError = await response.text();
      return {
        error: {
          code: response.status.toString(),
          description: `Resposta inesperada (não-JSON): ${textError.substring(0, 200)}`,
          referer: 'HTTP_PROTOCOL',
          fatal: response.status >= 500
        }
      };
    }
  } catch (error: any) {
    return {
      error: {
        code: 'NETWORK_OR_URL_ERROR',
        description: `Erro de Conexão: ${error.message}. Verifique a URL do Proxy ou bloqueios de CORS.`,
        referer: 'OMIE_SERVICE',
        fatal: true
      }
    };
  }
};
