import { Prisma, PrismaClient } from '@prisma/client';
import { NotFoundError } from '../errors/not-found.error';

// --- Data Transfer Objects (DTOs) ---

/**
 * Represents the author information attached to an article.
 */
export interface ArticleAuthorDto {
  id: string;
  name: string;
}

/**
 * Represents the full public view of a single article.
 */
export interface ArticleDto {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: ArticleAuthorDto;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a summarized article for list views, omitting the full content.
 */
export type ArticleListItemDto = Omit<ArticleDto, 'content'>;

/**
 * Represents a paginated response for a list of articles.
 */
export interface PaginatedArticlesDto {
  data: ArticleListItemDto[];
  meta: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// --- Query Definitions ---

export interface GetArticleBySlugQuery {
  slug: string;
}

export interface GetArticleByIdQuery {
  id: string;
}

export interface ListArticlesQuery {
  page?: number;
  limit?: number;
  tag?: string;
  authorId?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  sortBy?: 'publishedAt' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// --- Prisma Select Clause for DTO mapping ---
// This is a best practice to ensure we only fetch what's needed from the database
// and that the shape of the data matches our DTOs.
const articleDtoSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  content: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  tags: {
    select: {
      name: true,
    },
  },
  author: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ArticleSelect;

type PrismaArticlePayload = Prisma.ArticleGetPayload<{
  select: typeof articleDtoSelect;
}>;

// --- Handler Implementation ---

/**
 * Handles all read-side operations (queries) for articles.
 * This class is designed to be instantiated with a Prisma client and used
 * to fetch data in an optimized way for display purposes.
 */
export class ArticleQueryHandler {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Maps a raw Prisma article object to a clean ArticleDto.
   * This ensures a consistent return shape and decouples the database model from the API response.
   * @param article - The article object fetched from Prisma.
   * @returns An ArticleDto.
   */
  private toArticleDto(article: PrismaArticlePayload): ArticleDto {
    return {
      ...article,
      tags: article.tags.map((tag) => tag.name),
    };
  }

  /**
   * Fetches a single published article by its unique slug.
   * This is the primary method for retrieving an article for a public-facing blog post page.
   * @param query - The query containing the article slug.
   * @throws {NotFoundError} if no published article with the given slug is found.
   */
  public async handleGetArticleBySlug(
    query: GetArticleBySlugQuery,
  ): Promise<ArticleDto> {
    const { slug } = query;

    const article = await this.prisma.article.findUnique({
      where: {
        slug,
        status: 'PUBLISHED', // Public queries should only return published content
      },
      select: articleDtoSelect,
    });

    if (!article) {
      throw new NotFoundError(`Article with slug "${slug}" not found.`);
    }

    return this.toArticleDto(article);
  }

  /**
   * Fetches a single article by its ID, regardless of its status.
   * This is intended for internal or admin use cases, such as previewing a draft.
   * @param query - The query containing the article ID.
   * @throws {NotFoundError} if no article with the given ID is found.
   */
  public async handleGetArticleById(
    query: GetArticleByIdQuery,
  ): Promise<ArticleDto> {
    const { id } = query;

    const article = await this.prisma.article.findUnique({
      where: { id },
      select: articleDtoSelect,
    });

    if (!article) {
      throw new NotFoundError(`Article with ID "${id}" not found.`);
    }

    return this.toArticleDto(article);
  }

  /**
   * Fetches a paginated, filterable, and sortable list of articles.
   * By default, it only returns published articles.
   * @param query - The query containing pagination, filtering, and sorting options.
   */
  public async handleListArticles(
    query: ListArticlesQuery,
  ): Promise<PaginatedArticlesDto> {
    const {
      page = 1,
      limit = 10,
      tag,
      authorId,
      status = 'PUBLISHED', // Default to published for public queries
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ArticleWhereInput = {
      status,
      ...(authorId && { authorId }),
      ...(tag && {
        tags: {
          some: {
            name: {
              equals: tag,
              mode: 'insensitive',
            },
          },
        },
      }),
    };

    // Use a transaction to ensure the count and the data fetch are consistent
    const [articles, totalItems] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        // Exclude full content for list view to optimize payload size
        select: { ...articleDtoSelect, content: false },
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const mappedArticles = articles.map((article) => ({
      ...article,
      tags: article.tags.map((t) => t.name),
    }));

    return {
      data: mappedArticles,
      meta: {
        totalItems,
        currentPage: page,
        itemsPerPage: limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}