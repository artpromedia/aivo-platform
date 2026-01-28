import { FastifyPluginAsync } from 'fastify';
import { logger } from '../utils/logger';

export const currencyRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/currencies
   * List all active currencies
   */
  fastify.get('/', async (request: any, reply) => {
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
    } catch (error) {
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
  fastify.get('/:code', async (request: any, reply) => {
    try {
      const { code } = request.params as { code: string };
      
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
    } catch (error) {
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
  fastify.get('/:code/format', async (request: any, reply) => {
    try {
      const { code } = request.params as { code: string };
      const query = request.query as { amount?: string };
      
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
    } catch (error) {
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
  fastify.get('/convert', async (request: any, reply) => {
    try {
      const query = request.query as { 
        from: string; 
        to: string; 
        amount: string;
      };
      
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
      const amountInUSD = amount / Number(fromCurrency.exchangeRateToUSD);
      const convertedAmount = amountInUSD * Number(toCurrency.exchangeRateToUSD);
      
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
          exchangeRate: Number(toCurrency.exchangeRateToUSD) / Number(fromCurrency.exchangeRateToUSD),
          ratesUpdatedAt: fromCurrency.exchangeRateUpdatedAt,
        },
      });
    } catch (error) {
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
function formatCurrency(amount: number, currency: any): string {
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
