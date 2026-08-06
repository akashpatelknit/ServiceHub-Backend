import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { SearchService } from '../services/search.service.js';

// Suggestion dropdown default: kept small since it renders in a popover under the
// header search bar. Full results page passes ?full=true to get the larger cap.
const SUGGESTION_LIMIT = 5;
const FULL_RESULTS_LIMIT = 20;

export const SearchController = {
  search: asyncHandler(async (req, res) => {
    const { q, limit, full } = req.query;
    const isFull = full === 'true';
    const resolvedLimit = limit ?? (isFull ? FULL_RESULTS_LIMIT : SUGGESTION_LIMIT);

    const result = await SearchService.search({ q, limit: resolvedLimit });
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Search results retrieved'));
  }),
};
