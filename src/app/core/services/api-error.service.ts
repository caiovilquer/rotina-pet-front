import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

interface ApiValidationError {
  field?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  message(error: unknown, fallback = 'Não foi possível concluir a ação.'): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 0) return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';

    const publicCode = typeof error.error?.error === 'string' ? error.error.error : null;
    switch (publicCode) {
      case 'AI_PROVIDER_UNAVAILABLE':
        return 'O assistente está indisponível agora. Tente novamente mais tarde ou continue pelo formulário manual.';
      case 'AI_RATE_LIMITED':
        return 'Você atingiu o limite do assistente nesta hora. Aguarde antes de tentar novamente.';
      case 'AI_OUTPUT_INVALID':
        return 'A resposta não pôde ser validada com segurança. Tente reformular ou use o formulário manual.';
    }

    const details = error.error?.details as ApiValidationError[] | undefined;
    const validation = details?.find(detail => detail.message);
    if (validation) return validation.field
      ? `${this.fieldLabel(validation.field)}: ${validation.message}`
      : validation.message!;

    if (typeof error.error?.message === 'string' && error.error.message.trim()) {
      return error.error.message;
    }

    switch (error.status) {
      case 401: return 'Sua sessão expirou. Entre novamente para continuar.';
      case 403: return 'Você não tem permissão para realizar esta ação.';
      case 404: return 'O registro solicitado não foi encontrado.';
      case 409: return 'Os dados foram alterados em outro lugar. Atualize e tente novamente.';
      case 429: return 'Muitas tentativas em pouco tempo. Aguarde um momento.';
      default: return error.status >= 500
        ? 'O serviço está temporariamente indisponível. Tente novamente em instantes.'
        : fallback;
    }
  }

  private fieldLabel(field: string): string {
    const key = field.split('.').pop() || field;
    return ({
      firstName: 'Nome',
      lastName: 'Sobrenome',
      rawPassword: 'Senha',
      newPassword: 'Nova senha',
      phoneNumber: 'Telefone',
      dateStart: 'Data e hora',
      birthdate: 'Data de nascimento',
      photoUrl: 'Foto',
      zipCode: 'CEP'
    } as Record<string, string>)[key] || key;
  }
}
