import swaggerJsdoc from 'swagger-jsdoc';

const paths = {
  '/health': {
    get: {
      summary: 'Saúde do serviço',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/pacientes': {
    get: {
      summary: 'Lista pacientes',
      tags: ['Alunos'],
      responses: {
        '200': { description: 'Lista de pacientes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Aluno' } } } } },
      },
    },
    post: {
      summary: 'Criar paciente (admin/responsavel/familiar)',
      tags: ['Alunos'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['nome', 'idade'],
              properties: {
                nome: { type: 'string' },
                idade: { type: 'integer' },
                local: { type: 'string', description: 'Onde o paciente está (casa, quarto, leito…)' },
                fotoUrl: { type: 'string', description: 'Data URL da foto de perfil' },
                condicoes: { type: 'array', items: { type: 'string' } },
                professorIds: { type: 'array', items: { type: 'string' } },
                responsavelIds: { type: 'array', items: { type: 'string' } },
                familiarIds: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Aluno criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Aluno' } } } } },
    },
  },
  '/pacientes/{id}': {
    get: {
      summary: 'Busca paciente por ID',
      tags: ['Alunos'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Aluno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Aluno' } } } },
        '403': { description: 'Não vinculado' },
        '404': { description: 'Não encontrado' },
      },
    },
    patch: {
      summary: 'Atualizar dados do paciente (admin)',
      tags: ['Alunos'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                nome: { type: 'string' },
                idade: { type: 'integer' },
                local: { type: 'string' },
                fotoUrl: { type: 'string', description: 'Data URL da foto de perfil', nullable: true },
                condicoes: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: { '200': { description: 'Aluno atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Aluno' } } } } },
    },
    delete: {
      summary: 'Deletar paciente (hard delete, admin)',
      tags: ['Alunos'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: '{ id, deletado }' } },
    },
  },
  '/pacientes/{id}/vinculos': {
    patch: {
      summary: 'Vincular/desvincular cuidadores, responsáveis e familiares a um paciente (admin)',
      tags: ['Alunos'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                professorIds: { type: 'array', items: { type: 'string' } },
                responsavelIds: { type: 'array', items: { type: 'string' } },
                familiarIds: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: { '200': { description: 'Aluno atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Aluno' } } } } },
    },
  },
  '/pacientes/{id}/vinculos/{uid}': {
    delete: {
      summary: 'Remover vínculo individual de um usuário a um paciente (admin)',
      tags: ['Alunos'],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'uid', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { '200': { description: 'Aluno atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Aluno' } } } } },
    },
  },
  '/estoque': {
    get: {
      summary: 'Lista materiais do estoque (admin: todos; demais: pacientes vinculados)',
      tags: ['Estoque'],
      parameters: [{ name: 'alunoId', in: 'query', schema: { type: 'string' } }],
      responses: { '200': { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/MaterialEstoque' } } } } } },
    },
    post: {
      summary: 'Cadastrar material (admin/responsável/familiar)',
      tags: ['Estoque'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['alunoId', 'nome', 'categoria', 'quantidade', 'unidade'],
              properties: {
                alunoId: { type: 'string' },
                nome: { type: 'string' },
                categoria: { type: 'string', enum: ['remedio', 'alimento', 'higiene', 'descartavel', 'roupa', 'outro'] },
                quantidade: { type: 'integer', minimum: 0 },
                unidade: { type: 'string' },
                quantidadeMinima: { type: 'integer', minimum: 0 },
                validade: { type: 'string' },
                observacao: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Material criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/MaterialEstoque' } } } } },
    },
  },
  '/estoque/{id}': {
    get: {
      summary: 'Busca material por ID',
      tags: ['Estoque'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Material', content: { 'application/json': { schema: { $ref: '#/components/schemas/MaterialEstoque' } } } },
        '403': { description: 'Aluno não vinculado' },
        '404': { description: 'Não encontrado' },
      },
    },
    patch: {
      summary: 'Atualizar material (campos parciais)',
      tags: ['Estoque'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                alunoId: { type: 'string' },
                nome: { type: 'string' },
                categoria: { type: 'string', enum: ['remedio', 'alimento', 'higiene', 'descartavel', 'roupa', 'outro'] },
                quantidade: { type: 'integer', minimum: 0 },
                unidade: { type: 'string' },
                quantidadeMinima: { type: 'integer', minimum: 0 },
                validade: { type: 'string', nullable: true },
                observacao: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
      responses: { '200': { description: 'Material atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/MaterialEstoque' } } } } },
    },
    delete: {
      summary: 'Remover material',
      tags: ['Estoque'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: '{ id, deletado }' } },
    },
  },
  '/estoque/{id}/movimentacao': {
    patch: {
      summary: 'Registrar entrada ou saída de estoque',
      tags: ['Estoque'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['tipo', 'quantidade'],
              properties: {
                tipo: { type: 'string', enum: ['entrada', 'saida'] },
                quantidade: { type: 'integer', minimum: 1 },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Material atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/MaterialEstoque' } } } },
        '409': { description: 'Estoque insuficiente para a saída' },
      },
    },
  },
  '/atividades': {
    get: {
      summary: 'Lista todas as atividades (admin)',
      tags: ['Atividades'],
      security: [{ bearerAuth: [] }],
      responses: { '200': { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Atividade' } } } } } },
    },
    post: {
      summary: 'Registrar atividade',
      tags: ['Atividades'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['alunoId', 'tipo', 'descricao'],
              properties: {
                alunoId: { type: 'string' },
                tipo: { type: 'string', enum: ['alimentacao', 'medicacao', 'higiene', 'humor', 'ocorrencia'] },
                descricao: { type: 'string' },
                meta: { type: 'object', additionalProperties: true },
                consumos: {
                  type: 'array',
                  description: 'Materiais do estoque consumidos no registro',
                  items: {
                    type: 'object',
                    required: ['materialId', 'quantidade'],
                    properties: {
                      materialId: { type: 'string' },
                      quantidade: { type: 'integer', minimum: 1 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Criada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Atividade' } } } } },
    },
  },
  '/atividades/hoje': {
    get: {
      summary: 'Registros do dia',
      tags: ['Atividades'],
      parameters: [{ name: 'alunoId', in: 'query', schema: { type: 'string' } }],
      responses: { '200': { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Atividade' } } } } } },
    },
  },
  '/atividades/resumo': {
    get: {
      summary: 'Resumo por tipo',
      tags: ['Atividades'],
      parameters: [{ name: 'alunoId', in: 'query', schema: { type: 'string' } }],
      responses: { '200': { description: 'Mapa tipo->count' } },
    },
  },
  '/atividades/paciente/{id}': {
    get: {
      summary: 'Timeline do paciente',
      tags: ['Atividades'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Atividade' } } } } } },
    },
  },
  '/usuarios': {
    get: {
      summary: 'Lista usuários (admin)',
      tags: ['Usuários'],
      responses: { '200': { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Usuario' } } } } } },
    },
  },
  '/usuarios/totais': {
    get: {
      summary: 'Totais de usuários (admin)',
      tags: ['Usuários'],
      responses: { '200': { description: '{ total, ativos }' } },
    },
  },
  '/usuarios/{uid}': {
    get: {
      summary: 'Busca usuário por UID',
      tags: ['Usuários'],
      parameters: [{ name: 'uid', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Usuário', content: { 'application/json': { schema: { $ref: '#/components/schemas/Usuario' } } } } },
    },
    patch: {
      summary: 'Ativar/desativar acesso (admin)',
      tags: ['Usuários'],
      parameters: [{ name: 'uid', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['ativo'], properties: { ativo: { type: 'boolean' } } } } },
      },
      responses: { '200': { description: 'Atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Usuario' } } } } },
    },
    delete: {
      summary: 'Deletar usuário (hard delete, admin)',
      tags: ['Usuários'],
      parameters: [{ name: 'uid', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: '{ uid, deletado }' } },
    },
  },
  '/usuarios/{uid}/token-fcm': {
    post: {
      summary: 'Registrar token FCM (próprio usuário ou admin)',
      tags: ['Notificações'],
      parameters: [{ name: 'uid', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } } } },
      },
      responses: { '200': { description: 'Usuário atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Usuario' } } } } },
    },
    delete: {
      summary: 'Remover token FCM (próprio usuário ou admin)',
      tags: ['Notificações'],
      parameters: [{ name: 'uid', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } } } },
      },
      responses: { '200': { description: 'Usuário atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Usuario' } } } } },
    },
  },
  '/convites': {
    post: {
      summary: 'Convidar acesso (admin)',
      tags: ['Convites'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['nome', 'email', 'role'],
              properties: {
                nome: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string', enum: ['admin', 'professor', 'responsavel', 'responsavel'] },
                alunoIds: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: { '201': { description: '{ uid, email, role, senhaTemporaria? }' } },
    },
  },
  '/auditoria': {
    get: {
      summary: 'Lista auditoria (admin)',
      tags: ['Auditoria'],
      parameters: [{ name: 'nivel', in: 'query', schema: { type: 'string', enum: ['info', 'alerta', 'critico'] } }],
      responses: { '200': { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Auditoria' } } } } } },
    },
  },
  '/comunicados': {
    get: {
      summary: 'Lista comunicados',
      tags: ['Comunicados'],
      responses: { '200': { description: 'Lista', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Comunicado' } } } } } },
    },
  },
  '/auth/claims/renovar': {
    post: {
      summary: 'Renovar custom claims',
      tags: ['Auth'],
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', properties: { uid: { type: 'string' } } } } },
      },
      responses: { '200': { description: '{ uid, role, alunoIds }' } },
    },
  },
  '/notificacoes': {
    post: {
      summary: 'Enviar push via FCM (admin)',
      tags: ['Notificações'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'body'],
              properties: {
                title: { type: 'string' },
                body: { type: 'string' },
                uid: { type: 'string', description: 'Envia para todos os tokens do usuário' },
                token: { type: 'string', description: 'Envia para um token específico' },
                data: { type: 'object', additionalProperties: { type: 'string' } },
                icon: { type: 'string', description: 'URL do ícone (default /assets/icons/icon-192.png)' },
                badge: { type: 'string', description: 'URL do badge (default /assets/icons/badge-72.png)' },
                link: { type: 'string', description: 'URL aberta ao clicar na notificação' },
              },
            },
          },
        },
      },
      responses: { '200': { description: '{ enviados, falhas, total, tokensRemovidos? }' } },
    },
  },
};

const options: any = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Presente Sempre — Backend API',
      version: '0.1.0',
      description: 'API Node.js + Firebase Admin do app Presente Sempre',
    },
    servers: [{ url: '/' }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT (Firebase ID token)' },
      },
      schemas: {
        Aluno: { type: 'object', properties: { id: { type: 'string' }, nome: { type: 'string' }, idade: { type: 'integer' }, local: { type: 'string' }, fotoUrl: { type: 'string', description: 'Data URL da foto de perfil' }, condicoes: { type: 'array', items: { type: 'string' } }, responsavelIds: { type: 'array', items: { type: 'string' } }, professorIds: { type: 'array', items: { type: 'string' } }, familiarIds: { type: 'array', items: { type: 'string' } }, entradaEm: { type: 'string' } } },
        Atividade: { type: 'object', properties: { id: { type: 'string' }, alunoId: { type: 'string' }, tipo: { type: 'string', enum: ['alimentacao', 'medicacao', 'higiene', 'humor', 'ocorrencia'] }, descricao: { type: 'string' }, autorUid: { type: 'string' }, autorNome: { type: 'string' }, criadoEm: { type: 'string', format: 'date-time' }, meta: { type: 'object', additionalProperties: true } } },
        Usuario: { type: 'object', properties: { uid: { type: 'string' }, nome: { type: 'string' }, email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['admin', 'professor', 'responsavel', 'responsavel'] }, alunoIds: { type: 'array', items: { type: 'string' } }, fcmTokens: { type: 'array', items: { type: 'string' } }, ativo: { type: 'boolean' }, criadoEm: { type: 'string', format: 'date-time' } } },
        Auditoria: { type: 'object', properties: { id: { type: 'string' }, ator: { type: 'string' }, acao: { type: 'string' }, alvo: { type: 'string' }, nivel: { type: 'string', enum: ['info', 'alerta', 'critico'] }, criadoEm: { type: 'string', format: 'date-time' } } },
        Comunicado: { type: 'object', properties: { id: { type: 'string' }, titulo: { type: 'string' }, corpo: { type: 'string' }, autor: { type: 'string' }, criadoEm: { type: 'string', format: 'date-time' }, fixado: { type: 'boolean' } } },
        MaterialEstoque: { type: 'object', properties: { id: { type: 'string' }, alunoId: { type: 'string' }, nome: { type: 'string' }, categoria: { type: 'string', enum: ['remedio', 'alimento', 'higiene', 'descartavel', 'roupa', 'outro'] }, quantidade: { type: 'integer' }, unidade: { type: 'string' }, quantidadeMinima: { type: 'integer' }, validade: { type: 'string' }, observacao: { type: 'string' }, atualizadoEm: { type: 'string', format: 'date-time' }, criadoEm: { type: 'string', format: 'date-time' } } },
        Error: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } } },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);