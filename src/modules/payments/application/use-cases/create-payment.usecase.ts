import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { PaymentResponseDto } from '../dtos/payment-response.dto';
import { PaymentsRepository } from '../ports/payments.repository';
import { PaymentGateway } from '../ports/payment-gateway';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { validateCPF } from '@shared/validators/is-cpf.validator';
import { PaymentEntity } from '../../domain/payment.entity';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';

@Injectable()
export class CreatePaymentUseCase {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(dto: CreatePaymentDto): Promise<PaymentResponseDto> {
    this.logger.logInfo('CREATE_PAYMENT_START', 'Starting payment creation', {
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
    });

    if (!validateCPF(dto.payerCpf)) {
      this.logger.logWarn(
        'CREATE_PAYMENT_INVALID_CPF',
        'Invalid CPF provided',
        {
          cpf: dto.payerCpf,
        },
      );
      throw new UnprocessableEntityException('Invalid CPF');
    }

    const paymentData: Partial<PaymentEntity> = {
      amount: dto.amount,
      description: dto.description,
      payerCpf: dto.payerCpf,
      paymentMethod: dto.paymentMethod,
      status: PaymentStatus.PENDING,
    };

    if (dto.paymentMethod === PaymentMethod.CREDIT_CARD) {
      paymentData.mpExternalReference = randomUUID();

      this.logger.logInfo(
        'CREATE_PAYMENT_GATEWAY_INIT',
        'Initializing gateway preference',
        {
          externalReference: paymentData.mpExternalReference,
        },
      );

      const gatewayResult = await this.paymentGateway.createPreference({
        ...paymentData,
      } as PaymentEntity);

      paymentData.mpPreferenceId = gatewayResult.preferenceId;
      paymentData.mpInitPoint = gatewayResult.initPoint;
      paymentData.mpSandboxInitPoint = gatewayResult.sandboxInitPoint;
    }

    const payment = await this.paymentsRepository.create(paymentData);

    this.logger.logInfo(
      'CREATE_PAYMENT_SUCCESS',
      'Payment created successfully',
      {
        paymentId: payment.id,
        status: payment.status,
      },
    );

    return PaymentResponseDto.fromEntity(payment);
  }
}
