

## API Endpoints

- **GET /**
  - **Description**: Health check / hello endpoint.
  - **Response**:
    ```json
    "Hello World!"
    ```

- **GET /book**
  - **Description**: Get all books.
  - **Response**:
    ```json
    [
      { "id": 1, "title": "...", "author": "..." },
      { "id": 2, "title": "...", "author": "..." },
    ]
    ``

- **POST /book/upload**
  - **Description**: Upload an EPUB file for ingestion.
  - **Body**: multipart/form-data with field `book` (file).
  - **Response**:
    ```json
    { "message": "<status message>" }
    ```

- **DELETE /book/:id**
  - **Description**: Delete a book by id (and associated data if configured).
  - **Params**: `id` (number)
  - **Response**:
    ```json
    { "message": "Book with id <id> deleted successfully" }
    ```

- **GET /book/:bookId/status**
  - **Description**: Get processing status and progress percentage for a book.
  - **Params**: `bookId` (number)
  - **Response**:
    ```json
    {
      "id": 1,
      "status": "processing",
      "progressPercentage": 45
    }
    ```
  Note: `status` can be `"processing"`, `"completed"`, or `"failed"`. `progressPercentage` ranges from 0-100.

- **GET /book/:bookId/sentences?start=NUMBER&end=NUMBER**
  - **Description**: Return concatenated sentences from `start` to `end` (inclusive), plus minimal context.
  - **Params**: `bookId` (number)
  - **Query**: `start` (number, 1-based), `end` (number, >= start)
  - **Response**:
    ```json
    {
      "bookId": 1,
      "bookTitle": "...",
      "bookAuthor": "...",
      "startSentence": 1,
      "endSentence": 10,
      "totalSentences": 100,
      "fullSentence": "<joined sentences or empty>",
      "previousSentence": "<previous sentence or empty>",
      "nextSentence": "<next sentence or empty>"
    }
    ```
  Note: `totalSentences` is the total number of sentences in the book.

- **GET /feed?limit=NUMBER**
  - **Description**: Get randomized feed of snippet cards.
  - **Query**: `limit` (optional number)
  - **Response (array of)**:
    ```json
    {
      "bookId": 1,
      "bookTitle": "...",
      "bookAuthor": "...",
      "snippetId": 10,
      "snippetText": "...",
      "totalSnippets": 100,
      "reason": "...",
      "sentenceText": "...",
      "textToSearch": "first 8 words...",
      "themes": ["theme1", "theme2"],
      "startSentence": 12,
      "endSentence": 18
    }
    ```

- **GET /feed/book/:bookId?limit=NUMBER**
  - **Description**: Get feed filtered by book.
  - **Params**: `bookId` (number)
  - **Query**: `limit` (optional number)
  - **Response**: Same shape as `GET /feed`.

- **GET /feed/theme/:theme?limit=NUMBER**
  - **Description**: Get feed filtered by theme.
  - **Params**: `theme` (string)
  - **Query**: `limit` (optional number)
  - **Response**: Same shape as `GET /feed`.
