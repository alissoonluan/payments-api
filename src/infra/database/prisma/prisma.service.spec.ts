import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService.get.mockReturnValue(
      'postgresql://user:pass@localhost:5432/testdb',
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error when DATABASE_URL is missing', () => {
    mockConfigService.get.mockReturnValue(undefined);

    expect(() => {
      new PrismaService(configService);
    }).toThrow(
      'DATABASE_URL is missing. Check your .env / docker-compose environment.',
    );
  });

  it('should throw error when DATABASE_URL is null', () => {
    mockConfigService.get.mockReturnValue(null);

    expect(() => {
      new PrismaService(configService);
    }).toThrow(
      'DATABASE_URL is missing. Check your .env / docker-compose environment.',
    );
  });

  it('should throw error when DATABASE_URL is empty string', () => {
    mockConfigService.get.mockReturnValue('');

    expect(() => {
      new PrismaService(configService);
    }).toThrow(
      'DATABASE_URL is missing. Check your .env / docker-compose environment.',
    );
  });

  it('should initialize with valid DATABASE_URL', () => {
    const validUrl = 'postgresql://user:pass@localhost:5432/testdb';
    mockConfigService.get.mockReturnValue(validUrl);

    const prismaService = new PrismaService(configService);

    expect(prismaService).toBeDefined();
    expect(configService.get).toHaveBeenCalledWith('DATABASE_URL');
  });

  it('should call $connect on module init', async () => {
    const connectSpy = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('should call $disconnect on module destroy', async () => {
    const disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle connection errors gracefully', async () => {
    const error = new Error('Connection failed');
    jest.spyOn(service, '$connect').mockRejectedValue(error);

    await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
  });

  it('should handle disconnection errors gracefully', async () => {
    const error = new Error('Disconnection failed');
    jest.spyOn(service, '$disconnect').mockRejectedValue(error);

    await expect(service.onModuleDestroy()).rejects.toThrow(
      'Disconnection failed',
    );
  });
});
