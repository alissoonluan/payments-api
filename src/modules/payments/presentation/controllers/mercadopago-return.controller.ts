import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';

@ApiTags('Payments - Return URLs')
@Controller('api/mercadopago')
export class MercadoPagoReturnController {
  constructor(private readonly logger: AppLoggerService) {}

  @Get('success')
  @ApiOperation({
    summary: 'Handle successful payment redirect from Mercado Pago',
  })
  @ApiQuery({ name: 'payment_id', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'external_reference', required: false, type: String })
  @ApiQuery({ name: 'merchant_order_id', required: false, type: String })
  handleSuccess(@Query() query: any) {
    this.logger.logInfo(
      'MP_RETURN_SUCCESS',
      'User redirected to success page',
      {
        query,
      },
    );
    return {
      title: 'Payment Successful',
      message: 'Your payment was processed successfully.',
      details: query,
    };
  }

  @Get('failure')
  @ApiOperation({ summary: 'Handle failed payment redirect from Mercado Pago' })
  @ApiQuery({ name: 'payment_id', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'external_reference', required: false, type: String })
  @ApiQuery({ name: 'merchant_order_id', required: false, type: String })
  handleFailure(@Query() query: any) {
    this.logger.logInfo(
      'MP_RETURN_FAILURE',
      'User redirected to failure page',
      {
        query,
      },
    );
    return {
      title: 'Payment Failed',
      message: 'Your payment could not be processed.',
      details: query,
    };
  }

  @Get('pending')
  @ApiOperation({
    summary: 'Handle pending payment redirect from Mercado Pago',
  })
  @ApiQuery({ name: 'payment_id', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'external_reference', required: false, type: String })
  @ApiQuery({ name: 'merchant_order_id', required: false, type: String })
  handlePending(@Query() query: any) {
    this.logger.logInfo(
      'MP_RETURN_PENDING',
      'User redirected to pending page',
      {
        query,
      },
    );
    return {
      title: 'Payment Pending',
      message: 'Your payment is being processed.',
      details: query,
    };
  }
}
