import { Category, Subcategory, Service } from '../../service-catalog/models/index.js';

// Mongo's $text search has a token-length floor and won't match partial words well
// (e.g. "ac" won't cleanly $text-match "AC Repair"), so short queries fall back to a
// case-insensitive regex on `name` instead.
const TEXT_SEARCH_MIN_LENGTH = 3;

// Regex-path candidates are fetched a few times over the requested limit so that,
// after re-ranking (prefix matches first), the best `limit` results survive even if
// they weren't the first `limit` rows Mongo happened to return.
const CANDIDATE_MULTIPLIER = 4;
const MAX_CANDIDATES = 100;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildMatchQuery(Model, term, useText, candidateLimit, extraFilter = {}) {
  const baseFilter = { isActive: true, ...extraFilter };

  if (useText) {
    return Model.find({ ...baseFilter, $text: { $search: term } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(candidateLimit);
  }

  const regex = new RegExp(escapeRegExp(term), 'i');
  return Model.find({ ...baseFilter, name: regex }).limit(candidateLimit);
}

/** Ranks category/subcategory candidates: by textScore, or prefix-match-first then sortOrder. */
function rankCategoryLike(docs, term, useText) {
  if (useText) {
    return docs.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  const prefixRegex = new RegExp(`^${escapeRegExp(term)}`, 'i');
  return docs.slice().sort((a, b) => {
    const aRank = prefixRegex.test(a.name) ? 0 : 1;
    const bRank = prefixRegex.test(b.name) ? 0 : 1;
    if (aRank !== bRank) return aRank - bRank;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

/** Same idea as rankCategoryLike, but the regex-path tiebreaker is rating, not sortOrder. */
function rankServices(docs, term, useText) {
  if (useText) {
    return docs.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  const prefixRegex = new RegExp(`^${escapeRegExp(term)}`, 'i');
  return docs.slice().sort((a, b) => {
    const aRank = prefixRegex.test(a.name) ? 0 : 1;
    const bRank = prefixRegex.test(b.name) ? 0 : 1;
    if (aRank !== bRank) return aRank - bRank;

    const aScore = (a.rating?.average ?? 0) * 1000 + (a.rating?.count ?? 0);
    const bScore = (b.rating?.average ?? 0) * 1000 + (b.rating?.count ?? 0);
    return bScore - aScore;
  });
}

export const SearchService = {
  /**
   * Searches Category, Subcategory, and Service in parallel and returns a grouped,
   * ranked result. Category and Subcategory matches are merged into one `categories`
   * group (each item tagged with `type`) since both link to a listing page and the
   * UI only has one "Categories" section.
   *
   * `products` always ships as an empty array — Product has no slug/customer-facing
   * routes yet, so it's out of scope for now, but the shape is ready for it.
   */
  async search({ q, limit }) {
    const term = q.trim();
    const useText = term.length >= TEXT_SEARCH_MIN_LENGTH;
    const candidateLimit = Math.min(limit * CANDIDATE_MULTIPLIER, MAX_CANDIDATES);

    const [categoryDocs, subcategoryDocs, serviceDocs] = await Promise.all([
      buildMatchQuery(Category, term, useText, candidateLimit)
        .select('name slug image displayType sortOrder')
        .lean(),
      buildMatchQuery(Subcategory, term, useText, candidateLimit)
        .select('name slug image displayType sortOrder category')
        .populate('category', 'slug')
        .lean(),
      buildMatchQuery(Service, term, useText, candidateLimit)
        .select('name slug price mrp images rating category subcategory')
        .populate('category', 'slug')
        .populate('subcategory', 'slug')
        .lean(),
    ]);

    const categoryLikeDocs = [
      ...categoryDocs.map((doc) => ({ ...doc, type: 'category' })),
      ...subcategoryDocs.map((doc) => ({ ...doc, type: 'subcategory' })),
    ];

    const categories = rankCategoryLike(categoryLikeDocs, term, useText)
      .slice(0, limit)
      .map((doc) => ({
        id: String(doc._id),
        name: doc.name,
        slug: doc.slug,
        image: doc.image ?? null,
        displayType: doc.displayType,
        type: doc.type,
        ...(doc.type === 'subcategory' ? { categorySlug: doc.category?.slug ?? null } : {}),
      }));

    const services = rankServices(serviceDocs, term, useText)
      .slice(0, limit)
      .map((doc) => ({
        id: String(doc._id),
        name: doc.name,
        slug: doc.slug,
        price: doc.price,
        mrp: doc.mrp ?? null,
        image: doc.images?.[0] ?? null,
        rating: { average: doc.rating?.average ?? 0, count: doc.rating?.count ?? 0 },
        categorySlug: doc.category?.slug ?? null,
        subcategorySlug: doc.subcategory?.slug ?? null,
      }));

    return { query: term, categories, services, products: [] };
  },
};
