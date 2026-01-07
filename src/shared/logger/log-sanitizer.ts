export class LogSanitizer {
  private static readonly SENSITIVE_KEYS = [
    'password',
    'token',
    'access_token',
    'authorization',
    'secret',
    'cvv',
    'card_number',
    'cardnumber',
    'credit_card',
    'cpf',
    'email',
    'api_key',
    'apikey',
    'x-api-key',
    'webhook_secret',
  ];

  static sanitize(obj: any): any {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return obj.map((item: any) => this.sanitize(item));
    }

    const sanitized = { ...obj };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();

      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
      if (this.isSensitive(lowerKey)) {
        sanitized[key] = '***MASKED***';
      }
    }
    return sanitized;
  }

  private static isSensitive(key: string): boolean {
    return this.SENSITIVE_KEYS.some((sensitive) => key.includes(sensitive));
  }
}
