import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../infra/database/prisma/prisma.service';
import { PaymentStatus } from '../../domain/payment.enums';
import { PaymentEntity } from '../../domain/payment.entity';
import {
  ListPaymentsFilter,
  PaymentsRepository,
} from '../../application/ports/payments.repository';
import { Prisma } from '@prisma/client';
import { PaymentPrismaMapper } from '../mappers/payment.prisma.mapper';

@Injectable()
export class PaymentsPrismaRepository implements PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Partial<PaymentEntity>): Promise<PaymentEntity> {
    try {
      const prismaData = PaymentPrismaMapper.toPrismaCreate(data);
      const payment = await this.prisma.payment.create({
        data: prismaData,
      });
      return PaymentPrismaMapper.toDomain(payment);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('External reference already exists');
        }
      }
      throw error;
    }
  }

  async update(
    id: string,
    data: Partial<PaymentEntity>,
  ): Promise<PaymentEntity> {
    const updateData = PaymentPrismaMapper.toPrismaUpdate(data);

    const payment = await this.prisma.payment.update({
      where: { id },
      data: updateData,
    });
    return PaymentPrismaMapper.toDomain(payment);
  }

  async findById(id: string): Promise<PaymentEntity | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });
    return payment ? PaymentPrismaMapper.toDomain(payment) : null;
  }

  async findByExternalReference(
    externalReference: string,
  ): Promise<PaymentEntity | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { mpExternalReference: externalReference },
    });
    return payment ? PaymentPrismaMapper.toDomain(payment) : null;
  }

  async list(filter: ListPaymentsFilter): Promise<PaymentEntity[]> {
    const where: Prisma.PaymentWhereInput = {};
    if (filter.payerCpf) where.payerCpf = filter.payerCpf;
    if (filter.paymentMethod) where.paymentMethod = filter.paymentMethod;

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((payment) => PaymentPrismaMapper.toDomain(payment));
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
  ): Promise<PaymentEntity> {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: { status },
    });
    return PaymentPrismaMapper.toDomain(payment);
  }
}
