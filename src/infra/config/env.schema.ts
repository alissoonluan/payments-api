import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),
  MERCADOPAGO_ACCESS_TOKEN: Joi.string().optional().allow(''),
  MERCADOPAGO_WEBHOOK_SECRET: Joi.string().optional().allow(''),
  MERCADOPAGO_NOTIFICATION_URL: Joi.string().optional().allow(''),
  MERCADOPAGO_BACK_URL_SUCCESS: Joi.string().optional().allow(''),
  MERCADOPAGO_BACK_URL_FAILURE: Joi.string().optional().allow(''),
  MERCADOPAGO_BACK_URL_PENDING: Joi.string().optional().allow(''),
});
