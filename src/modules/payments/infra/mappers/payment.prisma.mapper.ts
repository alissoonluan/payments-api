import { Payment, Prisma } from '@prisma/client';
import { PaymentEntity } from '../../domain/payment.entity';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';

export class PaymentPrismaMapper {
  static toDomain(this: void, model: Payment): PaymentEntity {
    return new PaymentEntity({
      id: model.id,
      amount: (model.amount as unknown as Prisma.Decimal).toNumber(),
      description: model.description,
      payerCpf: model.payerCpf,
      paymentMethod: model.paymentMethod as PaymentMethod,
      status: model.status as PaymentStatus,
      mpExternalReference: (model.mpExternalReference as string) ?? undefined,
      mpPreferenceId: (model.mpPreferenceId as string) ?? undefined,
      mpInitPoint: (model.mpInitPoint as string) ?? undefined,
      mpSandboxInitPoint: (model.mpSandboxInitPoint as string) ?? undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  static toPrismaCreate(
    this: void,
    entity: Partial<PaymentEntity>,
  ): Prisma.PaymentCreateInput {
    return {
      amount: new Prisma.Decimal(entity.amount!),
      description: entity.description!,
      payerCpf: entity.payerCpf!,
      paymentMethod: entity.paymentMethod!,
      status: entity.status,
      mpExternalReference: entity.mpExternalReference,
      mpPreferenceId: entity.mpPreferenceId,
      mpInitPoint: entity.mpInitPoint,
      mpSandboxInitPoint: entity.mpSandboxInitPoint,
    };
  }

  static toPrismaUpdate(
    this: void,
    entity: Partial<PaymentEntity>,
  ): Prisma.PaymentUpdateInput {
    const updateData: Prisma.PaymentUpdateInput = {};

    if (entity.amount !== undefined) {
      updateData.amount = new Prisma.Decimal(entity.amount);
    }

    if (entity.description !== undefined) {
      updateData.description = entity.description;
    }

    if (entity.status !== undefined) {
      updateData.status = entity.status;
    }

    if (entity.mpPreferenceId !== undefined) {
      updateData.mpPreferenceId = entity.mpPreferenceId;
    }

    if (entity.mpInitPoint !== undefined) {
      updateData.mpInitPoint = entity.mpInitPoint;
    }

    if (entity.mpSandboxInitPoint !== undefined) {
      updateData.mpSandboxInitPoint = entity.mpSandboxInitPoint;
    }

    return updateData;
  }
}
