
import { ConnectionLog, CredentialProfile } from '../types';

const LOG_LIMIT = 100;
const EXPIRY_DAYS = 7;

export const performMaintenance = () => {
  console.log('[Maintenance] Iniciando rotina de limpeza interna...');
  
  // 1. Limpeza de Logs antigos ou excessivos
  const savedLogs = localStorage.getItem('omie_connection_logs');
  if (savedLogs) {
    try {
      let logs: ConnectionLog[] = JSON.parse(savedLogs);
      const now = new Date().getTime();
      const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      // Filtrar por idade e limite de quantidade
      logs = logs
        .filter(log => (now - new Date(log.timestamp).getTime()) < expiryMs)
        .slice(0, LOG_LIMIT);

      localStorage.setItem('omie_connection_logs', JSON.stringify(logs));
      console.log(`[Maintenance] Logs otimizados: ${logs.length} entradas mantidas.`);
    } catch (e) {
      localStorage.removeItem('omie_connection_logs');
    }
  }

  // 2. Validação de integridade de Perfis
  const savedProfiles = localStorage.getItem('omie_credential_profiles');
  if (savedProfiles) {
    try {
      const profiles: CredentialProfile[] = JSON.parse(savedProfiles);
      const validProfiles = profiles.filter(p => p.id && p.appKey && p.appSecret);
      if (validProfiles.length !== profiles.length) {
        localStorage.setItem('omie_credential_profiles', JSON.stringify(validProfiles));
        console.warn('[Maintenance] Perfis corrompidos removidos.');
      }
    } catch (e) {
      localStorage.removeItem('omie_credential_profiles');
    }
  }
};

export const clearSensitiveData = () => {
  const keysToRemove = [
    'omie_app_key',
    'omie_app_secret',
    'omie_credential_profiles',
    'omie_connection_logs'
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));
};
