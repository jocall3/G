import { takeLatest, call, put } from 'redux-saga/effects';

// --- Interfaces for Data Models ---
interface ArticleData {
  title: string;
  content: string;
  keywords: string[];
  // Add other relevant article fields as needed
}

interface Article extends ArticleData {
  id: string;
  imageUrl?: string;
  status: 'draft' | 'published' | 'pending_image' | 'failed';
  createdAt: string;
  updatedAt: string;
}

// --- Action Types ---
// Main saga orchestration actions
export const PUBLISH_ARTICLE_REQUEST = 'articles/PUBLISH_ARTICLE_REQUEST';
export const PUBLISH_ARTICLE_SUCCESS = 'articles/PUBLISH_ARTICLE_SUCCESS';
export const PUBLISH_ARTICLE_FAILURE = 'articles/PUBLISH_ARTICLE_FAILURE';

// Internal API interaction actions (could be handled by separate API sagas, but for choreography, we keep them here)
export const CREATE_ARTICLE_API_REQUEST = 'articles/CREATE_ARTICLE_API_REQUEST';
export const CREATE_ARTICLE_API_SUCCESS = 'articles/CREATE_ARTICLE_API_SUCCESS';
export const CREATE_ARTICLE_API_FAILURE = 'articles/CREATE_ARTICLE_API_FAILURE';

export const GENERATE_HEADER_IMAGE_REQUEST = 'articles/GENERATE_HEADER_IMAGE_REQUEST';
export const GENERATE_HEADER_IMAGE_SUCCESS = 'articles/GENERATE_HEADER_IMAGE_SUCCESS';
export const GENERATE_HEADER_IMAGE_FAILURE = 'articles/GENERATE_HEADER_IMAGE_FAILURE';

export const UPDATE_ARTICLE_IMAGE_API_REQUEST = 'articles/UPDATE_ARTICLE_IMAGE_API_REQUEST';
export const UPDATE_ARTICLE_IMAGE_API_SUCCESS = 'articles/UPDATE_ARTICLE_IMAGE_API_SUCCESS';
export const UPDATE_ARTICLE_IMAGE_API_FAILURE = 'articles/UPDATE_ARTICLE_IMAGE_API_FAILURE';

export const UPDATE_NEXUS_API_REQUEST = 'articles/UPDATE_NEXUS_API_REQUEST';
export const UPDATE_NEXUS_API_SUCCESS = 'articles/UPDATE_NEXUS_API_SUCCESS';
export const UPDATE_NEXUS_API_FAILURE = 'articles/UPDATE_NEXUS_API_FAILURE';

// --- Action Creators ---
// Generic action interface for consistency
interface ReduxAction<T extends string, P = undefined> {
  type: T;
  payload: P;
}

// Helper to create actions
const createAction = <T extends string, P = undefined>(type: T, payload: P): ReduxAction<T, P> => ({ type, payload });

export const publishArticleRequest = (payload: ArticleData) =>
  createAction(PUBLISH_ARTICLE_REQUEST, payload);
export const publishArticleSuccess = (articleId: string) =>
  createAction(PUBLISH_ARTICLE_SUCCESS, { articleId });
export const publishArticleFailure = (articleId: string | null, error: string) =>
  createAction(PUBLISH_ARTICLE_FAILURE, { articleId, error });

export const createArticleApiRequest = (payload: Omit<ArticleData, 'keywords'>) =>
  createAction(CREATE_ARTICLE_API_REQUEST, payload);
export const createArticleApiSuccess = (article: Article) =>
  createAction(CREATE_ARTICLE_API_SUCCESS, article);
export const createArticleApiFailure = (error: string) =>
  createAction(CREATE_ARTICLE_API_FAILURE, { error });

export const generateHeaderImageRequest = (articleId: string, keywords: string[]) =>
  createAction(GENERATE_HEADER_IMAGE_REQUEST, { articleId, keywords });
export const generateHeaderImageSuccess = (articleId: string, imageUrl: string) =>
  createAction(GENERATE_HEADER_IMAGE_SUCCESS, { articleId, imageUrl });
export const generateHeaderImageFailure = (articleId: string, error: string) =>
  createAction(GENERATE_HEADER_IMAGE_FAILURE, { articleId, error });

export const updateArticleImageApiRequest = (articleId: string, imageUrl: string) =>
  createAction(UPDATE_ARTICLE_IMAGE_API_REQUEST, { articleId, imageUrl });
export const updateArticleImageApiSuccess = (articleId: string, imageUrl: string) =>
  createAction(UPDATE_ARTICLE_IMAGE_API_SUCCESS, { articleId, imageUrl });
export const updateArticleImageApiFailure = (articleId: string, error: string) =>
  createAction(UPDATE_ARTICLE_IMAGE_API_FAILURE, { articleId, error });

export const updateNexusApiRequest = (articleId: string, nexusData: { title: string; imageUrl?: string }) =>
  createAction(UPDATE_NEXUS_API_REQUEST, { articleId, ...nexusData });
export const updateNexusApiSuccess = (articleId: string) =>
  createAction(UPDATE_NEXUS_API_SUCCESS, { articleId });
export const updateNexusApiFailure = (articleId: string, error: string) =>
  createAction(UPDATE_NEXUS_API_FAILURE, { articleId, error });


// --- API Services (Mocked for demonstration) ---
// In a real application, these would be actual API calls, likely in a separate `api` directory.
const apiService = {
  createArticle: async (articleData: Omit<ArticleData, 'keywords'>): Promise<Article> => {
    console.log('API: Creating article...', articleData);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    if (Math.random() > 0.1) { // 90% success rate
      return {
        id: `art-${Date.now()}`,
        ...articleData,
        keywords: [], // Keywords are typically not stored directly in the article for image generation
        status: 'pending_image',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      throw new Error('Failed to create article in database.');
    }
  },
  updateArticleImage: async (articleId: string, imageUrl: string): Promise<{ success: boolean }> => {
    console.log(`API: Updating article ${articleId} with image URL: ${imageUrl}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    if (Math.random() > 0.1) {
      return { success: true };
    } else {
      throw new Error('Failed to update article image URL.');
    }
  },
  updateNexus: async (articleId: string, nexusData: { title: string; imageUrl?: string }): Promise<{ success: boolean }> => {
    console.log(`API: Updating Nexus for article ${articleId} with data:`, nexusData);
    await new Promise(resolve => setTimeout(resolve, 800));
    if (Math.random() > 0.1) {
      return { success: true };
    } else {
      throw new Error('Failed to update Nexus with article information.');
    }
  },
};

// Forge Service (Mocked for demonstration)
const forgeService = {
  generateHeaderImage: async (articleId: string, keywords: string[]): Promise<{ imageUrl: string }> => {
    console.log(`Forge: Requesting image for article ${articleId} using keywords: ${keywords.join(', ')}`);
    await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate AI generation time
    if (Math.random() > 0.1) {
      return { imageUrl: `https://forge.ai/generated/${articleId}-${Date.now()}.jpg` };
    } else {
      throw new Error('Forge AI failed to generate header image.');
    }
  },
};

// --- Saga Worker ---

/**
 * Orchestrates the multi-step process of creating an article,
 * generating a header image via the Forge, and updating the Nexus.
 * This is the implementation of the publishing saga choreography (Covenant 69).
 */
function* publishArticleSaga(action: ReturnType<typeof publishArticleRequest>) {
  const { title, content, keywords } = action.payload;
  let articleId: string | null = null; // To track article ID for potential cleanup/error reporting

  try {
    // Step 1: Create the Article in the database
    yield put(createArticleApiRequest({ title, content }));
    const createdArticle: Article = yield call(apiService.createArticle, { title, content });
    articleId = createdArticle.id;
    yield put(createArticleApiSuccess(createdArticle));
    console.log(`[Saga] Article created with ID: ${articleId}`);

    // Step 2: Generate Header Image via the Forge AI
    yield put(generateHeaderImageRequest(articleId, keywords));
    const { imageUrl }: { imageUrl: string } = yield call(forgeService.generateHeaderImage, articleId, keywords);
    yield put(generateHeaderImageSuccess(articleId, imageUrl));
    console.log(`[Saga] Header image generated: ${imageUrl}`);

    // Update the newly created article with the generated image URL
    yield put(updateArticleImageApiRequest(articleId, imageUrl));
    yield call(apiService.updateArticleImage, articleId, imageUrl);
    yield put(updateArticleImageApiSuccess(articleId, imageUrl));
    console.log(`[Saga] Article ${articleId} updated with header image.`);

    // Step 3: Update the Nexus with the new article information
    yield put(updateNexusApiRequest(articleId, { title, imageUrl }));
    yield call(apiService.updateNexus, articleId, { title, imageUrl });
    yield put(updateNexusApiSuccess(articleId));
    console.log(`[Saga] Nexus updated for article ${articleId}.`);

    // All steps completed successfully
    yield put(publishArticleSuccess(articleId));
    console.log(`[Saga] Article publishing choreography complete for ID: ${articleId}`);

  } catch (error: any) {
    console.error(`[Saga] Article publishing saga failed for article ID ${articleId || 'N/A'}:`, error);
    // Dispatch a general failure action.
    // In a real-world scenario, more sophisticated error handling and rollback
    // mechanisms (e.g., compensating transactions) would be implemented here.
    // For example, if article creation succeeded but image generation failed,
    // you might want to mark the article as 'failed' or 'needs_image' and
    // potentially trigger a cleanup or retry mechanism.
    yield put(publishArticleFailure(articleId, error.message || 'An unknown error occurred during publishing.'));
  }
}

// --- Saga Watcher ---

/**
 * Watches for `PUBLISH_ARTICLE_REQUEST` actions and triggers the `publishArticleSaga`.
 * Uses `takeLatest` to ensure that if multiple publish requests come in quickly,
 * only the latest one is processed, cancelling any previous pending ones.
 */
export function* watchPublishArticleRequest() {
  yield takeLatest(PUBLISH_ARTICLE_REQUEST, publishArticleSaga);
}