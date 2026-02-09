
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
  }
];

export const THEME_COLORS = {
  petroleum: '#001c22',
  accent: '#07575B',
  surface: '#003B46',
  text: '#66A5AD'
};
