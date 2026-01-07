import { ExecutionContext, CallHandler } from '@nestjs/common';
import {
  RequestLoggingInterceptor,
  LOG_BODY_KEY,
} from './request-logging.interceptor';
import { AppLoggerService } from '../logger/app-logger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let logger: AppLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestLoggingInterceptor,
        {
          provide: AppLoggerService,
          useValue: {
            logInfo: jest.fn(),
            logError: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<RequestLoggingInterceptor>(
      RequestLoggingInterceptor,
    );
    logger = module.get<AppLoggerService>(AppLoggerService);
  });

  const mockContext = (body = {}): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: { 'user-agent': 'Jest', 'content-type': 'application/json' },
          body,
        }),
        getResponse: jest.fn().mockReturnValue({
          statusCode: 200,
        }),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getClass: jest.fn().mockReturnValue({}),
      getHandler: jest.fn().mockReturnValue({}),
    } as unknown as ExecutionContext;
  };

  const mockContextWithDecorator = (body = {}): ExecutionContext => {
    const context = mockContext(body);
    Reflect.defineMetadata(LOG_BODY_KEY, true, context.getHandler());
    return context;
  };

  const mockNext: CallHandler = {
    handle: jest.fn().mockReturnValue(of('response')),
  };

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log request start', (done) => {
    const context = mockContext();
    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(logger.logInfo).toHaveBeenCalledWith(
        'HTTP_REQUEST_START',
        'Incoming Request',
        expect.any(Object),
      );
      done();
    });
  });

  it('should log request end upon success', (done) => {
    const context = mockContext();
    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(logger.logInfo).toHaveBeenCalledWith(
        'HTTP_REQUEST_END',
        'Request Completed',
        expect.objectContaining({ statusCode: 200 }),
      );
      done();
    });
  });

  it('should log request body if decorated', (done) => {
    const body = { key: 'value' };
    const context = mockContextWithDecorator(body);

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(logger.logInfo).toHaveBeenCalledWith(
        'HTTP_REQUEST_START',
        'Incoming Request',
        expect.objectContaining({ body }),
      );
      done();
    });
  });

  it('should NOT log body if NOT decorated', (done) => {
    const body = { key: 'value' };
    const context = mockContext(body);

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(logger.logInfo).toHaveBeenCalledWith(
        'HTTP_REQUEST_START',
        'Incoming Request',
        expect.objectContaining({ body: undefined }),
      );
      done();
    });
  });

  it('should log duration on error', (done) => {
    const error = new Error('Test Error');
    const failNext: CallHandler = {
      handle: jest.fn().mockReturnValue(throwError(() => error)),
    };
    const context = mockContext();

    interceptor.intercept(context, failNext).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        expect(logger.logInfo).toHaveBeenCalledWith(
          'HTTP_REQUEST_FAILED_TIMING',
          'Request Failed (Metric)',
          expect.any(Object),
        );
        done();
      },
    });
  });
});
