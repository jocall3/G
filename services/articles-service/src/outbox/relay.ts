import { Prisma, PrismaClient } from '@prisma/client';

/**
 * A generic interface for a logger, compatible with common logging libraries.
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

/**
 * A generic interface for a message bus publisher. This decouples the relay
 * from a specific message bus implementation (e.g., Kafka, RabbitMQ, NATS).
 */
export interface MessageBus {
  /**
   * Publishes an event to a specific topic on the message bus.
   * @param topic The topic to publish the event to.
   * @param event The event payload, which should be a serializable object.
   * @throws An error if publishing fails.
   */
  publish(topic: string, event: Record<string, unknown>): Promise<void>;
}

/**
 * Represents the structure of a message retrieved from the outbox table.
 * This should align with your Prisma schema for the `Outbox` model.
 */
export interface OutboxMessage {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Prisma.JsonValue;
  createdAt: Date;
  publishedAt: Date | null;
}

/**
 * Configuration options for the OutboxRelay.
 */
export interface RelayOptions {
  /**
   * The interval in milliseconds to poll the outbox table for new messages.
   * @default 5000
   */
  pollingIntervalMs?: number;
  /**
   * The maximum number of messages to process in a single batch.
   * @default 10
   */
  batchSize?: number;
  /**
   * The name of the service, used for logging and identification.
   * @default 'OutboxRelay'
   */
  serviceName?: string;
}

const DEFAULTS: Required<RelayOptions> = {
  pollingIntervalMs: 5000,
  batchSize: 10,
  serviceName: 'OutboxRelay',
};

/**
 * Implements the Relay for the Outbox Pattern (Covenant 73).
 *
 * This class is a background process responsible for reliably delivering events
 * stored in the `Outbox` database table to a message bus. It ensures at-least-once
 * delivery semantics for critical domain events, such as `ArticlePublished`.
 *
 * It periodically polls the `Outbox` table for unpublished messages, publishes them
 * to the message bus, and marks them as published within a single database transaction.
 * This pattern prevents data loss and inconsistencies if the service crashes after
 * committing a business transaction but before publishing the corresponding event.
 *
 * The implementation uses `SELECT ... FOR UPDATE SKIP LOCKED` to safely handle
 * concurrent relay instances, making it suitable for horizontally scaled services.
 */
export class OutboxRelay {
  private readonly prisma: PrismaClient;
  private readonly messageBus: MessageBus;
  private readonly logger: Logger;
  private readonly options: Required<RelayOptions>;

  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isStopping = false;

  constructor(
    prisma: PrismaClient,
    messageBus: MessageBus,
    logger: Logger,
    options: RelayOptions = {},
  ) {
    this.prisma = prisma;
    this.messageBus = messageBus;
    this.logger = logger;
    this.options = { ...DEFAULTS, ...options };
  }

  /**
   * Starts the relay's polling process. If the relay is already running,
   * this method does nothing.
   */
  public start(): void {
    if (this.timer) {
      this.logger.warn('Relay is already running.', { service: this.options.serviceName });
      return;
    }

    this.isStopping = false;
    this.logger.info('Starting OutboxRelay...', {
      service: this.options.serviceName,
      options: this.options,
    });

    // Immediately process messages on start, then begin the interval.
    this.processMessages();
    this.timer = setInterval(
      () => this.processMessages(),
      this.options.pollingIntervalMs,
    );
  }

  /**
   * Stops the relay's polling process gracefully. It will allow any
   * in-flight processing to complete but will prevent new cycles from starting.
   */
  public stop(): void {
    if (!this.timer) {
      this.logger.warn('Relay is not running.', { service: this.options.serviceName });
      return;
    }

    this.isStopping = true;
    this.logger.info('Stopping OutboxRelay...', { service: this.options.serviceName });

    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * The main polling method. It includes a concurrency guard to prevent
   * overlapping executions if a processing cycle takes longer than the polling interval.
   */
  private async processMessages(): Promise<void> {
    if (this.isProcessing) {
      this.logger.info('Skipping poll cycle, as a previous one is still running.', {
        service: this.options.serviceName,
      });
      return;
    }

    if (this.isStopping) {
      this.logger.info('Skipping poll cycle, as the relay is stopping.', {
        service: this.options.serviceName,
      });
      return;
    }

    this.isProcessing = true;

    try {
      const messagesProcessed = await this.processBatch();
      if (messagesProcessed > 0) {
        this.logger.info(`Successfully processed and published ${messagesProcessed} outbox messages.`, {
          service: this.options.serviceName,
        });
      }
    } catch (error) {
      this.logger.error(
        'An unexpected error occurred during outbox processing batch. Messages will be retried.',
        error instanceof Error ? error : new Error(String(error)),
        { service: this.options.serviceName },
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processes a single batch of messages from the outbox within a database transaction.
   * @returns The number of messages successfully processed.
   */
  private async processBatch(): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      // Cast the transaction client to use raw queries within the transaction scope.
      const transactionPrisma = tx as unknown as Prisma.TransactionClient;

      // 1. Atomically select and lock a batch of unpublished messages.
      // `FOR UPDATE SKIP LOCKED` is a PostgreSQL-specific clause that prevents race conditions
      // when multiple relay instances are running. It locks the selected rows for this
      // transaction and causes other transactions to skip these locked rows.
      const messages = await transactionPrisma.$queryRaw<OutboxMessage[]>`
        SELECT *
        FROM "Outbox"
        WHERE "publishedAt" IS NULL
        ORDER BY "createdAt" ASC
        LIMIT ${this.options.batchSize}
        FOR UPDATE SKIP LOCKED
      `;

      if (messages.length === 0) {
        return 0; // No messages to process
      }

      // 2. Attempt to publish each message to the message bus.
      for (const message of messages) {
        try {
          // A common convention for topic names is `aggregateType.eventType`.
          const topic = `${message.aggregateType}.${message.eventType}`;
          await this.messageBus.publish(topic, message.payload as Record<string, unknown>);
        } catch (error) {
          this.logger.error(
            `Failed to publish message to bus. Rolling back transaction for the entire batch.`,
            error instanceof Error ? error : new Error(String(error)),
            { service: this.options.serviceName, messageId: message.id },
          );
          // Throwing an error within a Prisma transaction automatically triggers a rollback.
          // The messages will remain unpublished and will be retried in a future poll.
          throw error;
        }
      }

      // 3. If all messages were published successfully, mark them as published in the database.
      const messageIds = messages.map((m) => m.id);
      await transactionPrisma.outbox.updateMany({
        where: { id: { in: messageIds } },
        data: { publishedAt: new Date() },
      });

      return messages.length;
    },
    {
      // Set a reasonable timeout to prevent long-running transactions from locking rows indefinitely.
      timeout: 20000,
    });
  }
}