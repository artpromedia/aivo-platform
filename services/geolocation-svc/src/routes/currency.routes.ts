import type { FastifyPluginAsync } from 'fastify';

import type { Currency, CurrencyCodeParams, CurrencyConvertQuery, CurrencyFormatQuery } from '../types/fastify.d';
import { logger } from '../utils/logger';

export const currencyRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/currencies
   * List all active currencies
   */
  fastify.get('/', async (request, reply) => {
    try {
      const currencies = await request.services.prisma.currency.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });
      
      return reply.send({
        success: true,
        data: currencies,
        meta: {
          total: currencies.length,
        },
      });
    } catch {
      logger.error('Failed to list currencies');
      return reply.status(500).send({
        success: false,
        error: 'Failed to list currencies',
      });
    }
  });
  
  /**
   * GET /api/v1/currencies/:code
   * Get currency details
   */
  fastify.get<{ Params: CurrencyCodeParams }>('/:code', async (request, reply) => {
    try {
      const { code } = request.params;
      
      const currency = await request.services.prisma.currency.findUnique({
        where: { code: code.toUpperCase() },
      });
      
      if (!currency) {
        return reply.status(404).send({
          success: false,
          error: 'Currency not found',
        });
      }
      
      return reply.send({
        success: true,
        data: currency,
      });
    } catch {
      logger.error('Failed to get currency');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get currency details',
      });
    }
  });
  
  /**
   * GET /api/v1/currencies/:code/format
   * Get formatting rules for a currency
   */
  fastify.get<{ Params: CurrencyCodeParams; Querystring: CurrencyFormatQuery }>('/:code/format', async (request, reply) => {
    try {
      const { code } = request.params;
      const query = request.query;
      
      const currency = await request.services.prisma.currency.findUnique({
        where: { code: code.toUpperCase() },
      });
      
      if (!currency) {
        return reply.status(404).send({
          success: false,
          error: 'Currency not found',
        });
      }
      
      // Format example amount
      const amount = query.amount ? parseFloat(query.amount) : 1234.56;
      const formatted = formatCurrency(amount, currency);
      
      return reply.send({
        success: true,
        data: {
          code: currency.code,
          symbol: currency.symbol,
          symbolNative: currency.symbolNative,
          decimalDigits: currency.decimalDigits,
          thousandsSeparator: currency.thousandsSeparator,
          decimalSeparator: currency.decimalSeparator,
          symbolPosition: currency.symbolPosition,
          spaceBetween: currency.spaceBetween,
          example: {
            amount,
            formatted,
          },
        },
      });
    } catch {
      logger.error('Failed to get currency format');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get currency format',
      });
    }
  });
  
  /**
   * GET /api/v1/currencies/convert
   * Convert between currencies (using stored exchange rates)
   */
  fastify.get<{ Querystring: CurrencyConvertQuery }>('/convert', async (request, reply) => {
    try {
      const query = request.query;
      
      if (!query.from || !query.to || !query.amount) {
        return reply.status(400).send({
          success: false,
          error: 'from, to, and amount are required',
        });
      }
      
      const amount = parseFloat(query.amount);
      if (isNaN(amount)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid amount',
        });
      }
      
      const [fromCurrency, toCurrency] = await Promise.all([
        request.services.prisma.currency.findUnique({
          where: { code: query.from.toUpperCase() },
        }),
        request.services.prisma.currency.findUnique({
          where: { code: query.to.toUpperCase() },
        }),
      ]);
      
      if (!fromCurrency || !toCurrency) {
        return reply.status(404).send({
          success: false,
          error: 'One or both currencies not found',
        });
      }
      
      // Convert via USD
      const fromRate = Number(fromCurrency.exchangeRateToUSD) || 1;
      const toRate = Number(toCurrency.exchangeRateToUSD) || 1;
      const amountInUSD = amount / fromRate;
      const convertedAmount = amountInUSD * toRate;
      
      return reply.send({
        success: true,
        data: {
          from: {
            currency: fromCurrency.code,
            amount,
            formatted: formatCurrency(amount, fromCurrency),
          },
          to: {
            currency: toCurrency.code,
            amount: Math.round(convertedAmount * 100) / 100,
            formatted: formatCurrency(convertedAmount, toCurrency),
          },
          exchangeRate: toRate / fromRate,
          ratesUpdatedAt: fromCurrency.exchangeRateUpdatedAt,
        },
      });
    } catch {
      logger.error('Failed to convert currency');
      return reply.status(500).send({
        success: false,
        error: 'Failed to convert currency',
      });
    }
  });
};

/**
 * Format a currency amount according to currency rules
 */
function formatCurrency(amount: number, currency: Currency): string {
  // Round to appropriate decimal places
  const roundedAmount = amount.toFixed(currency.decimalDigits);
  
  // Split into integer and decimal parts
  const [intPart, decPart] = roundedAmount.split('.');
  
  // Add thousands separators
  const formattedInt = intPart.replace(
    /\B(?=(\d{3})+(?!\d))/g, 
    currency.thousandsSeparator
  );
  
  // Combine with decimal separator
  const formattedNumber = decPart 
    ? `${formattedInt}${currency.decimalSeparator}${decPart}`
    : formattedInt;
  
  // Add symbol
  const space = currency.spaceBetween ? ' ' : '';
  
  if (currency.symbolPosition === 'BEFORE') {
    return `${currency.symbolNative}${space}${formattedNumber}`;
  } else {
    return `${formattedNumber}${space}${currency.symbolNative}`;
  }
}
