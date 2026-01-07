import { Test, TestingModule } from '@nestjs/testing';
import { AppLoggerService } from './app-logger.service';
import { ConfigService } from '@nestjs/config';

jest.mock('../context/request-context.service', () => ({
  RequestContextService: {
    getContext: jest.fn().mockReturnValue({ correlationId: 'test-id' }),
  },
}));

describe('AppLoggerService', () => {
  let service: AppLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppLoggerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'LOG_LEVEL') return 'info';
              if (key === 'NODE_ENV') return 'test';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AppLoggerService>(AppLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log info message with context', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    service.logInfo('TEST_CODE', 'Test Message', { key: 'value' });

    expect(consoleSpy).toHaveBeenCalled();
    const logCall = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logCall).toEqual(
      expect.objectContaining({
        level: 'info',
        code: 'TEST_CODE',
        message: 'Test Message',
        key: 'value',
        tracing: expect.objectContaining({ correlationId: 'test-id' }),
      }),
    );

    consoleSpy.mockRestore();
  });

  it('should mask sensitive data', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    service.logInfo('TEST_SENSITIVE', 'Sensitive Data', {
      password: 'secret_password',
      credit_card: '1234',
    });

    const logCall = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logCall.password).toBe('***MASKED***');
    expect(logCall.credit_card).toBe('***MASKED***');

    consoleSpy.mockRestore();
  });

  it('should log error message', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Something failed');

    service.logError('TEST_ERROR', 'Error Message', error);

    expect(consoleSpy).toHaveBeenCalled();
    const logCall = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logCall.level).toBe('error');
    expect(logCall.message).toBe('Error Message');
    expect(logCall.error.stack).toBeDefined();

    consoleSpy.mockRestore();
  });
});
