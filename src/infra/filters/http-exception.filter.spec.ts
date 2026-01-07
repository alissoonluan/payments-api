import { AllExceptionsFilter } from './http-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/test',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should handle HttpException with string message', () => {
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Test error',
        path: '/api/test',
        error: null,
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle HttpException with object response containing message', () => {
    const exception = new HttpException(
      { message: 'Validation failed', error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'Bad Request',
        path: '/api/test',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle HttpException with object response without message field', () => {
    const exception = new HttpException(
      { error: 'Custom Error', details: 'Some details' },
      HttpStatus.FORBIDDEN,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        message: { error: 'Custom Error', details: 'Some details' },
        error: 'Custom Error',
        path: '/api/test',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle HttpException with array response', () => {
    const exception = new HttpException(
      ['error1', 'error2'],
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['error1', 'error2'],
        error: null,
        path: '/api/test',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle non-HttpException with 500 status', () => {
    const exception = new Error('Unexpected error');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: null,
        path: '/api/test',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle unknown exception type', () => {
    const exception = 'string exception';

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: null,
        path: '/api/test',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should include ISO timestamp in response', () => {
    const exception = new HttpException('Test', HttpStatus.NOT_FOUND);
    const beforeTime = new Date().toISOString();

    filter.catch(exception, mockHost);

    const afterTime = new Date().toISOString();
    const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];

    expect(callArgs.timestamp).toBeDefined();
    expect(callArgs.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(callArgs.timestamp >= beforeTime).toBe(true);
    expect(callArgs.timestamp <= afterTime).toBe(true);
  });

  it('should preserve request path in error response', () => {
    mockRequest.url = '/api/payment/123';
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/payment/123',
      }),
    );
  });
});
