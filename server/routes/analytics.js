/**
 * Analytics for a date range: sales compared with the range before it, a bar per day (or week),
 * best sellers, channels and ratings. All of it comes from the signed-in seller's own records.
 */
'use strict';

const { HttpError } = require('../http');
const { salesSummary, topProducts, ratings } = require('../services/shop-stats');
const { computeStats } = require('../stats');

const RANGES = [1, 7, 30, 90];

module.exports = function registerAnalyticsRoutes(router) {
  router.add('GET', '/api/analytics', { auth: true, ownerOnly: true }, ({ owner, url }) => {
    const days = Number(url.searchParams.get('days') || 7);
    if (!RANGES.includes(days)) throw new HttpError(400, 'Pick 1, 7, 30 or 90 days');
    const stats = computeStats(owner.id);
    return {
      summary: salesSummary(owner.id, days),
      bestSellers: topProducts(owner.id, days).products,
      channels: stats.channels,
      ratings: ratings(owner.id),
      visitsWeek: stats.visitsWeek,
    };
  });
};
