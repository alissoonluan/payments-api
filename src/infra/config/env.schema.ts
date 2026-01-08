import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  POSTGRES_USER: Joi.string().default('postgres'),
  POSTGRES_PASSWORD: Joi.string().default('postgres'),
  POSTGRES_DB: Joi.string().default('payments'),
  MERCADOPAGO_ACCESS_TOKEN: Joi.string().allow('').default('TEST-TOKEN'),
  MERCADOPAGO_NOTIFICATION_URL: Joi.string().default('http://localhost/notify'),
  MERCADOPAGO_BASE_URL: Joi.string().default('https://api.mercadopago.com'),
  MERCADOPAGO_SUCCESS_URL: Joi.string().default('http://localhost/success'),
  MERCADOPAGO_FAILURE_URL: Joi.string().default('http://localhost/failure'),
  MERCADOPAGO_PENDING_URL: Joi.string().default('http://localhost/pending'),
  TEMPORAL_ENABLED: Joi.boolean().default(true),
});
