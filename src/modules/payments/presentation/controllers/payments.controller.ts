import { Controller, Post, Body, Put, Param, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreatePaymentUseCase } from '../../application/use-cases/create-payment.usecase';
import { UpdatePaymentUseCase } from '../../application/use-cases/update-payment.usecase';
import { GetPaymentUseCase } from '../../application/use-cases/get-payment.usecase';
import { ListPaymentsUseCase } from '../../application/use-cases/list-payments.usecase';
import { CreatePaymentDto } from '../../application/dtos/create-payment.dto';
import { UpdatePaymentDto } from '../../application/dtos/update-payment.dto';
import { ListPaymentsQueryDto } from '../../application/dtos/list-payments-query.dto';
import { PaymentResponseDto } from '../../application/dtos/payment-response.dto';

@ApiTags('Payments')
@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly updatePaymentUseCase: UpdatePaymentUseCase,
    private readonly getPaymentUseCase: GetPaymentUseCase,
    private readonly listPaymentsUseCase: ListPaymentsUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new payment',
    description:
      'Creates a new payment. For PIX, the payment is created directly. For CREDIT_CARD, integrates with Mercado Pago to generate a checkout preference.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data (validation error)',
    schema: {
      example: {
        message: ['amount must not be less than 0.01', 'Invalid CPF'],
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Business validation failed (e.g. invalid CPF checksum)',
    schema: {
      example: {
        message: 'Invalid CPF',
        error: 'Unprocessable Entity',
        statusCode: 422,
      },
    },
  })
  async create(@Body() dto: CreatePaymentDto): Promise<PaymentResponseDto> {
    return this.createPaymentUseCase.execute(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update payment restricted fields' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 422, description: 'Invalid status transition' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.updatePaymentUseCase.execute(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
    schema: {
      example: {
        message: 'Payment with ID xyz not found',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  async getById(@Param('id') id: string): Promise<PaymentResponseDto> {
    return this.getPaymentUseCase.execute(id);
  }

  @Get()
  @ApiOperation({
    summary: 'List payments with filters',
    description:
      'Returns a list of payments. Can be filtered by CPF and/or payment method.',
  })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async list(
    @Query() query: ListPaymentsQueryDto,
  ): Promise<PaymentResponseDto[]> {
    return this.listPaymentsUseCase.execute(query);
  }
}
