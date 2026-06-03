/**
 * Pagination utility for consistent paginated responses across all endpoints.
 *
 * Usage:
 *   const { skip, limit, page } = parsePagination(req.query);
 *   const [data, total] = await Promise.all([
 *     Model.find(filter).skip(skip).limit(limit),
 *     Model.countDocuments(filter)
 *   ]);
 *   res.json(paginatedResponse(data, total, page, limit));
 */

/**
 * Parse pagination parameters from query string.
 * @param {object} query - req.query
 * @param {number} [defaultLimit=10] - default items per page
 * @returns {{ skip: number, limit: number, page: number }}
 */
function parsePagination(query, defaultLimit = 10) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;

  return { skip, limit, page };
}

/**
 * Build a standardised paginated response.
 * @param {Array} data - the result array
 * @param {number} total - total document count
 * @param {number} page - current page
 * @param {number} limit - items per page
 * @returns {object}
 */
function paginatedResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

module.exports = { parsePagination, paginatedResponse };
