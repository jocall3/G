# The Architect's Chronicle: Articles Service Treaty

## 1. Introduction

This document outlines the treaty for the Articles Service, a core component of "The Architect's Chronicle" project. This service is responsible for the creation, management, and retrieval of blog posts, specifically focusing on the expansion series derived from the AI banking license narrative. The service will facilitate the structured presentation of this multi-part blog series, ensuring a cohesive and engaging experience for readers.

## 2. Core Objectives

The Articles Service aims to achieve the following:

*   **Content Management:** Provide a robust system for creating, editing, and publishing blog posts.
*   **Series Structuring:** Enable the organization of posts into a coherent series, with a clear main post and subsequent expansions.
*   **Narrative Preservation:** Maintain the authentic voice and story of the AI banking license journey, including the founder's personal narrative and the vision of InfiniteAI.
*   **Data Integrity:** Ensure the accurate storage and retrieval of all blog content.
*   **Scalability:** Design the service to accommodate future growth in content and user engagement.

## 3. Data Model

The primary data entities managed by this service include:

### 3.1. `BlogPost`

Represents a single blog post within the series.

*   `id` (UUID): Unique identifier for the blog post.
*   `title` (String): The title of the blog post.
*   `slug` (String): A URL-friendly identifier for the post (e.g., `the-architects-chronicle-part-1`).
*   `seriesId` (UUID, nullable): Identifier linking the post to a specific blog series.
*   `isMainPost` (Boolean): Indicates if this post is the primary post of a series.
*   `content` (Text): The main body of the blog post, likely in Markdown or a similar format.
*   `authorId` (UUID): Identifier of the author (likely the founder).
*   `createdAt` (DateTime): Timestamp of post creation.
*   `updatedAt` (DateTime): Timestamp of last post update.
*   `publishedAt` (DateTime, nullable): Timestamp when the post was published.
*   `status` (Enum: `DRAFT`, `PUBLISHED`, `ARCHIVED`): The current status of the post.

### 3.2. `BlogSeries`

Represents a collection of related blog posts, forming a series.

*   `id` (UUID): Unique identifier for the blog series.
*   `title` (String): The overarching title of the blog series.
*   `description` (Text, nullable): A brief description of the series.
*   `mainPostId` (UUID): The `id` of the `BlogPost` that serves as the main entry point for the series.
*   `createdAt` (DateTime): Timestamp of series creation.
*   `updatedAt` (DateTime): Timestamp of last series update.

### 3.3. `Author`

Represents the creator of the blog posts.

*   `id` (UUID): Unique identifier for the author.
*   `name` (String): The name of the author (e.g., "The Architect").
*   `bio` (Text, nullable): A short biography of the author.
*   `profilePictureUrl` (String, nullable): URL to the author's profile picture.

## 4. API Endpoints

The Articles Service will expose the following RESTful API endpoints:

### 4.1. Blog Posts

*   **`POST /posts`**: Create a new blog post.
    *   **Request Body**: `BlogPost` object (excluding `id`, `createdAt`, `updatedAt`, `publishedAt`, `status`).
    *   **Response**: Created `BlogPost` object with its `id`.
*   **`GET /posts/:id`**: Retrieve a specific blog post by its ID.
    *   **Response**: `BlogPost` object.
*   **`GET /posts/:slug`**: Retrieve a specific blog post by its slug.
    *   **Response**: `BlogPost` object.
*   **`PUT /posts/:id`**: Update an existing blog post.
    *   **Request Body**: `BlogPost` object with updated fields.
    *   **Response**: Updated `BlogPost` object.
*   **`DELETE /posts/:id`**: Delete a blog post.
    *   **Response**: 204 No Content.
*   **`GET /posts`**: Retrieve a list of all blog posts (with optional filtering by status, author, series).
    *   **Query Parameters**: `status`, `authorId`, `seriesId`.
    *   **Response**: Array of `BlogPost` objects.

### 4.2. Blog Series

*   **`POST /series`**: Create a new blog series.
    *   **Request Body**: `BlogSeries` object (excluding `id`, `createdAt`, `updatedAt`).
    *   **Response**: Created `BlogSeries` object with its `id`.
*   **`GET /series/:id`**: Retrieve a specific blog series by its ID.
    *   **Response**: `BlogSeries` object, including its associated `BlogPost` entries.
*   **`GET /series`**: Retrieve a list of all blog series.
    *   **Response**: Array of `BlogSeries` objects.
*   **`PUT /series/:id`**: Update an existing blog series.
    *   **Request Body**: `BlogSeries` object with updated fields.
    *   **Response**: Updated `BlogSeries` object.
*   **`DELETE /series/:id`**: Delete a blog series.
    *   **Response**: 204 No Content.

### 4.3. Authors

*   **`POST /authors`**: Create a new author.
    *   **Request Body**: `Author` object (excluding `id`).
    *   **Response**: Created `Author` object with its `id`.
*   **`GET /authors/:id`**: Retrieve a specific author by their ID.
    *   **Response**: `Author` object.
*   **`GET /authors`**: Retrieve a list of all authors.
    *   **Response**: Array of `Author` objects.

## 5. Data Storage

The Articles Service will utilize a relational database (e.g., PostgreSQL) for persistent storage of blog posts, series, and author data. The schema will be defined and managed using an ORM (Object-Relational Mapper) like Prisma or TypeORM.

## 6. Authentication and Authorization

*   **Authentication**: All API endpoints will require authentication. This will be handled by a separate Authentication Service, likely using JWT (JSON Web Tokens).
*   **Authorization**: Role-based access control will be implemented.
    *   **Admin Role**: Can create, edit, delete posts and series, and manage authors.
    *   **Author Role**: Can create and edit their own posts.
    *   **Public Access**: Read-only access to published blog posts and series.

## 7. Error Handling

The service will adhere to standard HTTP status codes for error reporting:

*   `400 Bad Request`: Invalid request payload or parameters.
*   `401 Unauthorized`: Missing or invalid authentication credentials.
*   `403 Forbidden`: User does not have permission to perform the action.
*   `404 Not Found`: Resource (post, series, author) not found.
*   `500 Internal Server Error`: Unexpected server-side error.

Error responses will include a JSON payload with an `error` message and potentially a `details` field for more specific information.

## 8. Logging

Comprehensive logging will be implemented to track API requests, errors, and significant events within the service. This will aid in debugging and monitoring.

## 9. Versioning

API versioning will be implemented using URL prefixes (e.g., `/v1/posts`). This allows for backward-compatible changes and future API evolution.

## 10. Future Considerations

*   **Content Moderation**: Mechanisms for reviewing and approving user-submitted content (if applicable in the future).
*   **Search Functionality**: Integration with a search engine (e.g., Elasticsearch) for advanced content discovery.
*   **Comment System**: Integration with a commenting service for reader engagement.
*   **SEO Optimization**: Features to improve search engine visibility for blog posts.