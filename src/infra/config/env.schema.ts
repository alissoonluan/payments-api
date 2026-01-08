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
  MERCADOPAGO_ACCESS_TOKEN: Joi.string().required(),
  MERCADOPAGO_NOTIFICATION_URL: Joi.string().required(),
  MERCADOPAGO_BASE_URL: Joi.string().required(),
  MERCADOPAGO_SUCCESS_URL: Joi.string().required(),
  MERCADOPAGO_FAILURE_URL: Joi.string().required(),
  MERCADOPAGO_PENDING_URL: Joi.string().required(),
});
