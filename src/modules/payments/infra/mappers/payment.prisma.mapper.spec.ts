import { Payment, Prisma } from '@prisma/client';
import { PaymentEntity } from '../../domain/payment.entity';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { PaymentPrismaMapper } from './payment.prisma.mapper';

describe('PaymentPrismaMapper', () => {
  describe('toDomain', () => {
    it('should map a full Prisma model to a domain entity', () => {
      const model: Payment = {
        id: '1',
        amount: new Prisma.Decimal(100.5),
        description: 'Test',
        payerCpf: '12345678909',
        paymentMethod: 'CREDIT_CARD',
        status: 'PENDING',
        mpExternalReference: 'ref-123',
        mpPreferenceId: 'pref-123',
        mpInitPoint: 'http://init',
        mpSandboxInitPoint: 'http://sandbox',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const entity = PaymentPrismaMapper.toDomain(model);

      expect(entity).toBeInstanceOf(PaymentEntity);
      expect(entity.id).toBe('1');
      expect(entity.amount).toBe(100.5);
      expect(entity.mpExternalReference).toBe('ref-123');
      expect(entity.mpPreferenceId).toBe('pref-123');
    });

    it('should map minimal Prisma model to domain entity (nullable fields)', () => {
      const model: Payment = {
        id: '2',
        amount: new Prisma.Decimal(50),
        description: 'Minimal',
        payerCpf: '11122233344',
        paymentMethod: 'PIX',
        status: 'PAID',
        mpExternalReference: null,
        mpPreferenceId: null,
        mpInitPoint: null,
        mpSandboxInitPoint: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const entity = PaymentPrismaMapper.toDomain(model);

      expect(entity.mpPreferenceId).toBeUndefined();
      expect(entity.mpExternalReference).toBeUndefined();
    });
  });

  describe('toPrismaCreate', () => {
    it('should map entity to Prisma create input', () => {
      const entity = new PaymentEntity({
        amount: 200,
        description: 'Create',
        payerCpf: '11122233344',
        paymentMethod: PaymentMethod.PIX,
        status: PaymentStatus.PENDING,
      });

      const input = PaymentPrismaMapper.toPrismaCreate(entity);

      expect(input.amount).toEqual(new Prisma.Decimal(200));
      expect(input.description).toBe('Create');
      expect(input.status).toBe('PENDING');
    });
  });

  describe('toPrismaUpdate', () => {
    it('should map partial entity updates to Prisma update input', () => {
      const output = PaymentPrismaMapper.toPrismaUpdate({
        description: 'New Desc',
        status: PaymentStatus.PAID,
      });

      expect(output.description).toBe('New Desc');
      expect(output.status).toBe('PAID');
      expect(output.amount).toBeUndefined();
    });

    it('should map external reference fields if provided', () => {
      const output = PaymentPrismaMapper.toPrismaUpdate({
        mpPreferenceId: 'new-pref',
        mpInitPoint: 'new-init',
        mpSandboxInitPoint: 'new-sandbox',
      });

      expect(output.mpPreferenceId).toBe('new-pref');
      expect(output.mpInitPoint).toBe('new-init');
      expect(output.mpSandboxInitPoint).toBe('new-sandbox');
    });

    it('should map Decimal amount correctly', () => {
      const output = PaymentPrismaMapper.toPrismaUpdate({ amount: 123.45 });
      expect(output.amount).toEqual(new Prisma.Decimal(123.45));
    });
  });
});
