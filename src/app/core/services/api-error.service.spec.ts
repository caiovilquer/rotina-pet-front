import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorService } from './api-error.service';

describe('ApiErrorService AI errors', () => {
  const service = new ApiErrorService();

  it('maps provider details to a safe actionable message', () => {
    const message = service.message(new HttpErrorResponse({
      status: 502,
      error: { error: 'AI_PROVIDER_UNAVAILABLE', message: 'provider stack and response body' }
    }));

    expect(message).toContain('assistente está indisponível');
    expect(message).toContain('formulário manual');
    expect(message).not.toContain('provider stack');
  });

  it('explains the hourly AI rate limit', () => {
    const message = service.message(new HttpErrorResponse({
      status: 429,
      error: { error: 'AI_RATE_LIMITED' }
    }));

    expect(message).toContain('limite do assistente nesta hora');
  });

  it('does not expose invalid model output', () => {
    const message = service.message(new HttpErrorResponse({
      status: 502,
      error: { error: 'AI_OUTPUT_INVALID', message: '{untrusted raw model output}' }
    }));

    expect(message).toContain('validada com segurança');
    expect(message).not.toContain('untrusted');
  });
});
