import PDFDocument from 'pdfkit';
import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import type { Role } from '../domain/types/roles.js';
import type { Aluno } from '../domain/types/entidades.js';
import { alunosRepo } from '../repositories/alunos.repo.js';
import { atividadesRepo } from '../repositories/atividades.repo.js';
import { ocorrenciasRepo } from '../repositories/ocorrencias.repo.js';
import { prescricoesRepo } from '../repositories/prescricoes.repo.js';
import { administracoesRepo } from '../repositories/administracoes.repo.js';
import { estoqueRepo } from '../repositories/estoque.repo.js';

export interface AtorRelatorio {
  uid: string;
  role: Role;
}

const MARCA = '#c94a3a';
const TEXTO = '#2d2220';
const SUBTLE = '#7a6058';

function podeAcessar(paciente: Aluno, ator: AtorRelatorio): boolean {
  if (ator.role === 'admin') return true;
  return (
    paciente.professorIds.includes(ator.uid) ||
    paciente.responsavelIds.includes(ator.uid) ||
    paciente.familiarIds.includes(ator.uid)
  );
}

function dataIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diasEntre(de: string, ate: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${de}T12:00:00Z`);
  const fim = new Date(`${ate}T12:00:00Z`);
  while (cursor <= fim) {
    out.push(dataIso(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function aplicaNoDia(p: { ativo: boolean; inicio: string; fim?: string | undefined; diasSemana: number[] }, data: string): boolean {
  if (!p.ativo) return false;
  if (p.inicio && data < p.inicio) return false;
  if (p.fim && data > p.fim) return false;
  const dia = new Date(`${data}T12:00:00Z`).getUTCDay();
  return p.diasSemana.length === 0 || p.diasSemana.includes(dia);
}

export const relatorioService = {
  async gerar(
    alunoId: string,
    de: string,
    ate: string,
    ator: AtorRelatorio,
  ): Promise<{ buffer: Buffer; nome: string }> {
    const paciente = await alunosRepo.findById(alunoId);
    if (!paciente) throw new NotFoundError('Aluno não encontrado');
    if (!podeAcessar(paciente, ator)) {
      throw new ForbiddenError('Aluno não vinculado ao usuário');
    }

    const [atividades, ocorrencias, prescricoes, administracoes, estoque] = await Promise.all([
      atividadesRepo.listByAluno(alunoId),
      ocorrenciasRepo.listByAluno(alunoId),
      prescricoesRepo.listByAluno(alunoId),
      administracoesRepo.listByAluno(alunoId, de, ate),
      estoqueRepo.listByAluno(alunoId),
    ]);

    const atividadesPeriodo = atividades.filter((a) => {
      const d = a.criadoEm.slice(0, 10);
      return d >= de && d <= ate;
    });
    const ocorrenciasPeriodo = ocorrencias.filter((o) => {
      const d = o.criadoEm.slice(0, 10);
      return d >= de && d <= ate;
    });

    const dias = diasEntre(de, ate);
    let previstas = 0;
    let administradas = 0;
    for (const p of prescricoes) {
      for (const dia of dias) {
        if (!aplicaNoDia(p, dia)) continue;
        for (const horario of p.horarios) {
          previstas++;
          if (
            administracoes.some(
              (a) =>
                a.prescricaoId === p.id &&
                a.data === dia &&
                a.horario === horario &&
                a.status === 'administrado',
            )
          ) {
            administradas++;
          }
        }
      }
    }
    const adesao = previstas === 0 ? 100 : Math.round((administradas / previstas) * 100);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Cabeçalho
      doc.fillColor(MARCA).fontSize(20).font('Helvetica-Bold').text('Presente Sempre');
      doc.fillColor(SUBTLE).fontSize(9).font('Helvetica').text('Cuidado que acompanha');
      doc.moveDown(0.8);
      doc.fillColor(TEXTO).fontSize(16).font('Helvetica-Bold').text('Relatório do paciente');
      doc.fillColor(SUBTLE).fontSize(10).font('Helvetica').text(`Período: ${de} a ${ate}`);
      doc.moveDown(1);

      // Aluno
      doc.fillColor(TEXTO).fontSize(13).font('Helvetica-Bold').text(paciente.nome);
      doc.fontSize(10).font('Helvetica').fillColor(SUBTLE);
      doc.text(
        `${paciente.idade} anos${paciente.local ? ` · ${paciente.local}` : ''}`,
      );
      if (paciente.condicoes.length) doc.text(`Condições: ${paciente.condicoes.join(', ')}`);
      if (paciente.alergias.length) {
        doc.fillColor('#a03030').text(`Alergias: ${paciente.alergias.join(', ')}`);
      }
      if (paciente.restricoesAlimentares.length) {
        doc.fillColor(SUBTLE).text(`Restrições alimentares: ${paciente.restricoesAlimentares.join(', ')}`);
      }
      if (paciente.contatoEmergencia) {
        doc.text(
          `Emergência: ${paciente.contatoEmergencia.nome} · ${paciente.contatoEmergencia.telefone}`,
        );
      }
      if (paciente.medico) doc.text(`Médico: ${paciente.medico.nome}`);
      doc.moveDown(1);

      const secao = (titulo: string) => {
        doc.fillColor(MARCA).fontSize(12).font('Helvetica-Bold').text(titulo);
        doc.moveDown(0.3);
        doc.fillColor(TEXTO).fontSize(9).font('Helvetica');
      };

      // Resumo
      secao('Resumo');
      doc.fillColor(TEXTO).text(`Registros no período: ${atividadesPeriodo.length}`);
      doc.text(`Ocorrências no período: ${ocorrenciasPeriodo.length}`);
      doc.text(`Adesão à medicação: ${adesao}% (${administradas}/${previstas} doses)`);
      doc.moveDown(1);

      // Registros
      secao('Registros');
      if (atividadesPeriodo.length === 0) {
        doc.fillColor(SUBTLE).text('Nenhum registro no período.');
      } else {
        for (const a of atividadesPeriodo.slice(0, 80)) {
          const data = new Date(a.criadoEm).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
          doc.fillColor(SUBTLE).font('Helvetica-Bold').text(`${data} · ${a.tipo}`);
          doc.fillColor(TEXTO).font('Helvetica').text(a.descricao, { width: 495 });
          doc.moveDown(0.3);
        }
      }
      doc.moveDown(0.8);

      // Ocorrências
      secao('Ocorrências');
      if (ocorrenciasPeriodo.length === 0) {
        doc.fillColor(SUBTLE).text('Nenhuma ocorrência no período.');
      } else {
        for (const o of ocorrenciasPeriodo.slice(0, 40)) {
          doc
            .fillColor(o.gravidade === 'alta' || o.gravidade === 'critica' ? '#a03030' : TEXTO)
            .font('Helvetica-Bold')
            .text(`${o.titulo} · ${o.gravidade} · ${o.status}`);
          doc.fillColor(TEXTO).font('Helvetica').text(o.descricao, { width: 495 });
          if (o.resolucao) doc.fillColor(SUBTLE).text(`Resolução: ${o.resolucao}`, { width: 495 });
          doc.moveDown(0.3);
        }
      }
      doc.moveDown(0.8);

      // Medicação
      secao('Medicação');
      if (prescricoes.length === 0) {
        doc.fillColor(SUBTLE).text('Nenhuma prescrição cadastrada.');
      } else {
        for (const p of prescricoes) {
          doc
            .fillColor(TEXTO)
            .font('Helvetica-Bold')
            .text(`${p.medicamento} ${p.dose} · ${p.via}`);
          doc
            .fillColor(SUBTLE)
            .font('Helvetica')
            .text(`Horários: ${p.horarios.join(', ')} · desde ${p.inicio}${p.fim ? ` até ${p.fim}` : ''}`);
        }
      }
      doc.moveDown(0.8);

      // Estoque
      secao('Estoque');
      if (estoque.length === 0) {
        doc.fillColor(SUBTLE).text('Nenhum material cadastrado.');
      } else {
        for (const m of estoque) {
          const baixo = m.quantidade <= m.quantidadeMinima;
          doc
            .fillColor(baixo ? '#a03030' : TEXTO)
            .font('Helvetica')
            .text(
              `${m.nome}: ${m.quantidade} ${m.unidade} (mínimo ${m.quantidadeMinima})${baixo ? ' — repor' : ''}`,
            );
        }
      }

      doc.moveDown(1.5);
      doc
        .fillColor(SUBTLE)
        .fontSize(8)
        .text(`Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);

      doc.end();
    });

    return { buffer, nome: `relatorio-${paciente.nome.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-${de}-${ate}.pdf` };
  },
};
