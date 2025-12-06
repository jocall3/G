import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { CreateArticleCommand } from '../domain/commands/impl/create-article.command';
import { UpdateArticleCommand } from '../domain/commands/impl/update-article.command';
import { ArticleRepository } from '../infrastructure/repositories/article.repository';
import { ArticleAggregate } from '../domain/aggregates/article.aggregate';
import { ArticleNotFoundException } from '../domain/exceptions/article-not-found.exception';

/**
 * @description Handles the creation of a new article.
 * It validates the command, creates an ArticleAggregate, persists it, and publishes relevant events.
 */
@CommandHandler(CreateArticleCommand)
export class CreateArticleCommandHandler implements ICommandHandler<CreateArticleCommand> {
  private readonly logger = new Logger(CreateArticleCommandHandler.name);

  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly publisher: EventPublisher, // Used to merge aggregate context and publish events
  ) {}

  /**
   * Executes the CreateArticleCommand.
   * @param command The command containing data for the new article.
   * @returns The created ArticleAggregate.
   */
  async execute(command: CreateArticleCommand): Promise<ArticleAggregate> {
    this.logger.log(`Handling CreateArticleCommand for title: "${command.title}"`);

    const { title, content, authorId } = command;

    // 1. Create a new Article aggregate instance.
    // The static 'create' method on the aggregate should encapsulate initial state and event application.
    const newArticle = ArticleAggregate.create(uuidv4(), title, content, authorId);

    // 2. Merge the aggregate with the EventPublisher to enable event tracking and publishing.
    const article = this.publisher.mergeObjectContext(newArticle);

    // 3. Persist the new article's state to the database via the repository.
    await this.articleRepository.save(article);

    // 4. Commit the aggregate's changes, which publishes any recorded domain events (e.g., ArticleCreatedEvent).
    article.commit();

    this.logger.log(`Article created successfully with ID: ${article.id}`);
    return article;
  }
}

/**
 * @description Handles the update of an existing article.
 * It retrieves the article, applies updates, persists changes, and publishes relevant events.
 */
@CommandHandler(UpdateArticleCommand)
export class UpdateArticleCommandHandler implements ICommandHandler<UpdateArticleCommand> {
  private readonly logger = new Logger(UpdateArticleCommandHandler.name);

  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly publisher: EventPublisher, // Used to merge aggregate context and publish events
  ) {}

  /**
   * Executes the UpdateArticleCommand.
   * @param command The command containing the article ID and update data.
   * @returns The updated ArticleAggregate.
   * @throws {ArticleNotFoundException} If the article with the given ID does not exist.
   */
  async execute(command: UpdateArticleCommand): Promise<ArticleAggregate> {
    this.logger.log(`Handling UpdateArticleCommand for article ID: "${command.id}"`);

    const { id, title, content, authorId } = command;

    // 1. Retrieve the existing Article aggregate from the repository.
    const existingArticle = await this.articleRepository.findById(id);

    if (!existingArticle) {
      this.logger.warn(`Article with ID ${id} not found for update.`);
      throw new ArticleNotFoundException(id);
    }

    // 2. Merge the existing aggregate with the EventPublisher.
    const article = this.publisher.mergeObjectContext(existingArticle);

    // 3. Apply updates to the aggregate. The 'update' method on the aggregate should
    // encapsulate business rules and apply relevant events (e.g., ArticleUpdatedEvent).
    article.update(title, content, authorId);

    // 4. Persist the updated article's state to the database.
    await this.articleRepository.save(article);

    // 5. Commit the aggregate's changes, publishing any recorded domain events.
    article.commit();

    this.logger.log(`Article with ID ${id} updated successfully.`);
    return article;
  }
}

/**
 * @description Array of all command handlers for the Articles service.
 * This array is typically exported and registered in the NestJS module.
 */
export const CommandHandlers = [
  CreateArticleCommandHandler,
  UpdateArticleCommandHandler,
];