import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { PaymentResponseDto } from '../dtos/payment-response.dto';
import { PaymentsRepository } from '../ports/payments.repository';
import { PaymentGateway } from '../ports/payment-gateway';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { validateCPF } from '@shared/validators/is-cpf.validator';
import { PaymentEntity } from '../../domain/payment.entity';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';
import { PaymentWorkflowPort } from '../ports/payment-workflow.port';

@Injectable()
export class CreatePaymentUseCase {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly logger: AppLoggerService,
    private readonly paymentWorkflowPort: PaymentWorkflowPort,
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

    if (dto.paymentMethod === PaymentMethod.PIX) {
      const payment = await this.paymentsRepository.create(paymentData);

      this.logger.logInfo(
        'CREATE_PAYMENT_SUCCESS',
        'PIX payment created successfully',
        {
          paymentId: payment.id,
          status: payment.status,
        },
      );

      return PaymentResponseDto.fromEntity(payment);
    }

    const payment = await this.paymentsRepository.create(paymentData);

    await this.paymentsRepository.update(payment.id, {
      mpExternalReference: payment.id,
    });

    const updatedPayment = await this.paymentsRepository.findById(payment.id);

    this.logger.logInfo(
      'CREATE_PAYMENT_WORKFLOW_START',
      'Starting Temporal workflow for CREDIT_CARD payment',
      {
        paymentId: updatedPayment!.id,
        externalReference: updatedPayment!.mpExternalReference,
      },
    );

    await this.paymentWorkflowPort.startCreditCardWorkflow(
      updatedPayment!.id,
      updatedPayment!.mpExternalReference!,
    );

    let finalPayment = updatedPayment!;
    const startTime = Date.now();
    while (!finalPayment.mpInitPoint && Date.now() - startTime < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const found = await this.paymentsRepository.findById(payment.id);
      if (found) finalPayment = found;
    }

    this.logger.logInfo(
      'CREATE_PAYMENT_SUCCESS',
      'CREDIT_CARD payment created and workflow started',
      {
        paymentId: finalPayment.id,
        status: finalPayment.status,
        hasInitPoint: !!finalPayment.mpInitPoint,
      },
    );

    return PaymentResponseDto.fromEntity(finalPayment);
  }
}
