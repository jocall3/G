/**
 * @file This file defines the XState machine for managing the state of the article editor.
 * @description It handles the entire lifecycle of an article being edited, including loading,
 * creating, editing (dirty/pristine states), saving, and handling success or error states.
 * This machine is designed to be used in the Chronicle UI, as per Covenant 71.
 *
 * @see https://xstate.dev/docs/
 */

import { setup, assign, fromPromise } from 'xstate';

/**
 * Represents the core data structure for an article.
 */
export interface Article {
	id: string;
	title: string;
	content: string;
	// Other potential fields: status, authorId, publishDate, etc.
}

/**
 * The context (extended state) of the article machine.
 * It stores all the data necessary for the machine's logic.
 */
export interface ArticleMachineContext {
	articleId: string | null;
	title: string;
	content: string;
	errorMessage: string | null;
	/** Stores the original article data to detect changes (dirty state) and to revert. */
	originalArticle: Pick<Article, 'title' | 'content'> | null;
}

/**
 * The events that can be sent to the article machine to trigger state transitions.
 */
export type ArticleMachineEvent =
	| { type: 'LOAD'; articleId: string }
	| { type: 'CREATE_NEW' }
	| { type: 'CHANGE'; field: 'title' | 'content'; value: string }
	| { type: 'SAVE' }
	| { type: 'DISCARD_CHANGES' }
	| { type: 'RETRY' };

/**
 * The input required by the machine, typically provided when the actor is spawned.
 * This allows for dependency injection of asynchronous services.
 */
export interface ArticleMachineInput {
	/** A function that fetches an article by its ID. */
	loadArticle: (articleId: string) => Promise<Article>;
	/** A function that saves an article (creates if articleId is null, updates otherwise). */
	saveArticle: (data: {
		articleId: string | null;
		title: string;
		content: string;
	}) => Promise<Article>;
}

/**
 * The XState machine definition for the article editor.
 * It uses `setup` to provide strongly-typed actors, actions, and guards.
 */
export const articleMachine = setup({
	types: {
		context: {} as ArticleMachineContext,
		events: {} as ArticleMachineEvent,
		input: {} as ArticleMachineInput
	},
	actors: {
		/**
		 * Actor to perform the asynchronous operation of loading an article.
		 */
		loadArticle: fromPromise<Article, { articleId: string }>(async ({ input, self }) => {
			// The implementation is provided via input when the machine is created.
			const logic = self.system.get('articleLogic') as ArticleMachineInput;
			if (!logic || typeof logic.loadArticle !== 'function') {
				throw new Error('`loadArticle` implementation not provided.');
			}
			return logic.loadArticle(input.articleId);
		}),
		/**
		 * Actor to perform the asynchronous operation of saving an article.
		 */
		saveArticle: fromPromise<
			Article,
			{ articleId: string | null; title: string; content: string }
		>(async ({ input, self }) => {
			const logic = self.system.get('articleLogic') as ArticleMachineInput;
			if (!logic || typeof logic.saveArticle !== 'function') {
				throw new Error('`saveArticle` implementation not provided.');
			}
			return logic.saveArticle(input);
		})
	},
	actions: {
		/**
		 * Updates the title or content in the context based on a CHANGE event.
		 */
		assignChange: assign(({ event }) => {
			if (event.type !== 'CHANGE') return {};
			return {
				[event.field]: event.value
			};
		}),
		/**
		 * Updates the context with the fetched or saved article data.
		 */
		assignArticleData: assign(({ event }) => {
			if (event.type !== 'xstate.done.actor' || typeof event.output !== 'object' || !event.output) {
				return {};
			}
			const article = event.output as Article;
			return {
				articleId: article.id,
				title: article.title,
				content: article.content,
				originalArticle: { title: article.title, content: article.content },
				errorMessage: null
			};
		}),
		/**
		 * Assigns an error message to the context upon failure.
		 */
		assignError: assign({
			errorMessage: ({ event }) => {
				if (event.type !== 'xstate.error.actor') return 'An unknown error occurred.';
				const error = event.error as Error;
				return error.message || 'Failed to process the request.';
			}
		}),
		/**
		 * Clears any existing error message from the context.
		 */
		clearError: assign({
			errorMessage: null
		}),
		/**
		 * Resets the context to a blank slate for a new article.
		 */
		resetToNewArticle: assign({
			articleId: null,
			title: '',
			content: '',
			errorMessage: null,
			originalArticle: { title: '', content: '' }
		}),
		/**
		 * Reverts any changes made by the user to the original article state.
		 */
		discardChanges: assign(({ context }) => {
			if (!context.originalArticle) {
				return { title: '', content: '' };
			}
			return {
				title: context.originalArticle.title,
				content: context.originalArticle.content
			};
		})
	}
}).createMachine({
	id: 'articleEditor',
	context: {
		articleId: null,
		title: '',
		content: '',
		errorMessage: null,
		originalArticle: null
	},
	initial: 'idle',
	states: {
		idle: {
			on: {
				LOAD: {
					target: 'loading',
					actions: assign({ articleId: ({ event }) => event.articleId })
				},
				CREATE_NEW: {
					target: 'editing',
					actions: 'resetToNewArticle'
				}
			}
		},
		loading: {
			tags: ['loading'],
			invoke: {
				id: 'loadArticleActor',
				src: 'loadArticle',
				input: ({ context }) => ({ articleId: context.articleId! }),
				onDone: {
					target: 'editing',
					actions: 'assignArticleData'
				},
				onError: {
					target: 'loadingFailure',
					actions: 'assignError'
				}
			}
		},
		editing: {
			// This transient state immediately checks if the form is dirty or pristine.
			always: [
				{
					guard: ({ context }) =>
						context.originalArticle !== null &&
						(context.title !== context.originalArticle.title ||
							context.content !== context.originalArticle.content),
					target: 'editing.dirty'
				},
				{ target: 'editing.pristine' }
			],
			initial: 'pristine',
			states: {
				pristine: {
					on: {
						CHANGE: {
							target: 'dirty',
							actions: 'assignChange'
						}
					}
				},
				dirty: {
					on: {
						CHANGE: {
							// No target needed, stays in dirty state
							actions: 'assignChange'
						},
						SAVE: {
							target: '#articleEditor.saving'
						},
						DISCARD_CHANGES: {
							target: 'pristine',
							actions: 'discardChanges'
						}
					}
				}
			},
			on: {
				CREATE_NEW: {
					target: 'editing',
					actions: 'resetToNewArticle',
					reenter: true // Re-enter to reset the sub-state
				}
			}
		},
		saving: {
			tags: ['saving'],
			invoke: {
				id: 'saveArticleActor',
				src: 'saveArticle',
				input: ({ context }) => ({
					articleId: context.articleId,
					title: context.title,
					content: context.content
				}),
				onDone: {
					target: 'success',
					actions: 'assignArticleData'
				},
				onError: {
					target: 'savingFailure',
					actions: 'assignError'
				}
			}
		},
		success: {
			tags: ['success'],
			after: {
				2000: { target: 'editing' }
			}
		},
		loadingFailure: {
			tags: ['error'],
			on: {
				RETRY: {
					target: 'loading',
					actions: 'clearError'
				},
				CREATE_NEW: {
					target: 'editing',
					actions: 'resetToNewArticle'
				}
			}
		},
		savingFailure: {
			tags: ['error'],
			on: {
				RETRY: {
					target: 'saving',
					actions: 'clearError'
				},
				DISCARD_CHANGES: {
					target: 'editing',
					actions: ['discardChanges', 'clearError']
				}
			}
		}
	}
});