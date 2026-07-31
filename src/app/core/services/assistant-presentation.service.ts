import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CareDraftField, CareDraftWarning } from '../models/care-draft.model';

export type AssistantAction = 'question' | 'draft' | 'load' | 'review' | 'confirm' | 'cancel' | 'source';

export interface AssistantNotice {
  title: string;
  message: string;
  icon: string;
  retryable: boolean;
  manualFallback: boolean;
}

export interface AssistantWarningView {
  code: string;
  title: string;
  message: string;
  blocking: boolean;
  icon: string;
}

export type AssistantTextBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

@Injectable({ providedIn: 'root' })
export class AssistantPresentationService {
  error(error: unknown, action: AssistantAction): AssistantNotice {
    const fallback = this.fallback(action);
    if (!(error instanceof HttpErrorResponse)) return fallback;

    if (error.status === 0) {
      return {
        title: 'Parece que você está sem conexão',
        message: action === 'draft'
          ? 'Sua descrição continua aqui. Reconecte-se para tentar novamente ou abra o formulário manual.'
          : 'O que você escreveu continua aqui. Reconecte-se e tente novamente.',
        icon: 'wifi_off',
        retryable: true,
        manualFallback: action === 'draft',
      };
    }

    const publicCode = typeof error.error?.error === 'string' ? error.error.error : null;
    if (publicCode === 'AI_PROVIDER_UNAVAILABLE') {
      return {
        title: 'Assistente temporariamente indisponível',
        message: action === 'draft'
          ? 'Sua descrição foi preservada. Tente de novo em instantes ou continue pelo formulário manual.'
          : 'Não foi possível consultar o assistente agora. Sua pergunta foi preservada para uma nova tentativa.',
        icon: 'cloud_off',
        retryable: true,
        manualFallback: action === 'draft',
      };
    }
    if (publicCode === 'AI_RATE_LIMITED' || error.status === 429) {
      return {
        title: 'Pausa de uso atingida',
        message: action === 'draft'
          ? 'O limite desta hora foi alcançado. Sua descrição continua aqui e o formulário manual segue disponível.'
          : 'O limite desta hora foi alcançado. Aguarde um pouco antes de fazer outra consulta.',
        icon: 'schedule',
        retryable: false,
        manualFallback: action === 'draft',
      };
    }
    if (publicCode === 'AI_OUTPUT_INVALID') {
      return {
        title: 'Não consegui validar o resultado',
        message: action === 'draft'
          ? 'Para sua segurança, nenhum plano foi criado. Reformule a descrição ou use o formulário manual.'
          : 'A resposta não passou pelas verificações de segurança. Reformule a pergunta e tente novamente.',
        icon: 'verified_user',
        retryable: true,
        manualFallback: action === 'draft',
      };
    }

    switch (error.status) {
      case 401:
        return { title: 'Sua sessão expirou', message: 'Entre novamente para continuar com segurança.', icon: 'lock_clock', retryable: false, manualFallback: false };
      case 403:
        return { title: 'Acesso não permitido', message: 'Seu papel nesta família não permite concluir esta ação.', icon: 'lock', retryable: false, manualFallback: false };
      case 404:
        return { title: 'Conteúdo não encontrado', message: action === 'source' ? 'A fonte pode ter sido removida ou atualizada.' : 'Atualize a página e tente novamente.', icon: 'search_off', retryable: false, manualFallback: false };
      case 409:
        return { title: 'Este conteúdo foi atualizado', message: 'Recarregue os dados antes de continuar para não perder alterações.', icon: 'sync_problem', retryable: true, manualFallback: false };
      default:
        return error.status >= 500
          ? { ...fallback, title: 'Serviço temporariamente indisponível', icon: 'cloud_off', retryable: true }
          : fallback;
    }
  }

  warning(warning: CareDraftWarning): AssistantWarningView {
    const curated: Record<string, Omit<AssistantWarningView, 'code' | 'blocking'>> = {
      PET_AMBIGUOUS: {
        title: 'Confirme qual é o pet',
        message: 'A descrição combina com mais de um pet da família. Escolha o correto antes de salvar.',
        icon: 'pets',
      },
      SCHEDULE_AMBIGUOUS: {
        title: 'Revise quando o cuidado acontece',
        message: 'A frequência ou o horário não ficaram claros. Confira a seção “Quando acontece”.',
        icon: 'event_repeat',
      },
      CLINICAL_REQUEST: {
        title: 'Orientação clínica não é preenchida pela IA',
        message: 'Confirme medicamentos, doses e instruções diretamente com o profissional responsável.',
        icon: 'health_and_safety',
      },
      START_IN_PAST: {
        title: 'A primeira data já passou',
        message: 'Escolha uma data futura antes de confirmar o cuidado.',
        icon: 'event_busy',
      },
      AI_UNAVAILABLE: {
        title: 'Parte da descrição precisa de revisão',
        message: 'O assistente não concluiu todos os campos. Revise os itens destacados antes de salvar.',
        icon: 'edit_note',
      },
    };
    const view = curated[warning.code] ?? {
      title: warning.blocking ? 'Revisão necessária' : 'Confira este rascunho',
      message: warning.blocking
        ? 'Há uma informação que precisa ser confirmada antes de criar o plano.'
        : 'Revise os campos destacados para garantir que o cuidado esteja correto.',
      icon: warning.blocking ? 'error_outline' : 'info',
    };
    return { code: warning.code, blocking: warning.blocking, ...view };
  }

  failure(code?: string): AssistantNotice {
    if (code === 'AI_RATE_LIMITED') {
      return {
        title: 'O limite de uso foi atingido',
        message: 'Nenhum plano foi criado. Sua rotina pode ser cadastrada agora pelo formulário manual.',
        icon: 'schedule',
        retryable: false,
        manualFallback: true,
      };
    }
    return {
      title: 'O rascunho não pôde ser preparado',
      message: 'Nenhum plano foi criado. Você pode tentar outra descrição ou continuar pelo formulário manual.',
      icon: 'cloud_off',
      retryable: true,
      manualFallback: true,
    };
  }

  textBlocks(value: string | null | undefined): AssistantTextBlock[] {
    const normalized = this.normalize(value, 4000);
    if (!normalized) return [];

    const blocks: AssistantTextBlock[] = [];
    let list: string[] = [];
    let paragraph: string[] = [];
    const flushList = () => {
      if (list.length) blocks.push({ type: 'list', items: list });
      list = [];
    };
    const flushParagraph = () => {
      const text = paragraph.join(' ').trim();
      if (text) blocks.push({ type: 'paragraph', text });
      paragraph = [];
    };

    for (const rawLine of normalized.split('\n')) {
      const line = this.stripMarkdown(rawLine).trim();
      if (!line) {
        flushParagraph();
        flushList();
        continue;
      }
      const listItem = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
      if (listItem) {
        flushParagraph();
        list.push(listItem[1].trim());
      } else {
        flushList();
        paragraph.push(line);
      }
    }
    flushParagraph();
    flushList();
    return blocks;
  }

  plainText(value: string | null | undefined, maxLength = 240): string {
    return this.stripMarkdown(this.normalize(value, maxLength)).replace(/\s+/g, ' ').trim();
  }

  fieldLabel(field: CareDraftField): string {
    return ({
      PET: 'pet', TYPE: 'tipo de cuidado', TITLE: 'nome do cuidado', INSTRUCTIONS: 'orientações',
      START_AT: 'data e horário', TIMEZONE: 'fuso horário', SCHEDULE: 'repetição', REMINDER: 'lembrete',
      RESPONSIBLE: 'responsável', CRITICAL: 'nível crítico', ESCALATION: 'aviso ao proprietário',
      ESTIMATED_COST: 'custo previsto',
    } as Record<CareDraftField, string>)[field];
  }

  private fallback(action: AssistantAction): AssistantNotice {
    const actions: Record<AssistantAction, AssistantNotice> = {
      question: { title: 'Não consegui concluir a consulta', message: 'Sua pergunta foi preservada. Tente novamente em instantes.', icon: 'search_off', retryable: true, manualFallback: false },
      draft: { title: 'Não consegui preparar o rascunho', message: 'Sua descrição foi preservada. Tente novamente ou continue pelo formulário manual.', icon: 'edit_note', retryable: true, manualFallback: true },
      load: { title: 'Não consegui abrir o rascunho', message: 'Volte à lista e tente novamente.', icon: 'drafts', retryable: true, manualFallback: false },
      review: { title: 'Não consegui salvar a revisão', message: 'Suas alterações continuam no formulário. Tente salvar novamente.', icon: 'save_as', retryable: true, manualFallback: false },
      confirm: { title: 'O plano ainda não foi criado', message: 'O rascunho continua salvo. Revise os dados e tente confirmar novamente.', icon: 'event_busy', retryable: true, manualFallback: false },
      cancel: { title: 'Não consegui cancelar o rascunho', message: 'Ele continua ativo. Tente novamente em instantes.', icon: 'cancel', retryable: true, manualFallback: false },
      source: { title: 'Não consegui abrir esta fonte', message: 'O conteúdo pode ter sido atualizado. Tente novamente em instantes.', icon: 'link_off', retryable: true, manualFallback: false },
    };
    return actions[action];
  }

  private normalize(value: string | null | undefined, maxLength: number): string {
    return (value ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .slice(0, maxLength)
      .trim();
  }

  private stripMarkdown(value: string): string {
    return value
      .replace(/^\s{0,3}#{1,6}\s+/g, '')
      .replace(/^\s*>\s?/g, '')
      .replace(/!\[([^\]]*)\]\((?:[^()]|\([^)]*\))*\)/g, '$1')
      .replace(/\[([^\]]+)\]\((?:[^()]|\([^)]*\))*\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/(?<!\w)[*_]([^*_]+)[*_](?!\w)/g, '$1')
      .replace(/`{1,3}/g, '')
      .replace(/\b(?:https?|javascript|data):\S+/gi, '')
      .trim();
  }
}
