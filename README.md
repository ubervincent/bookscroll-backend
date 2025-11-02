

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

- **GET /book/snippets/search?q=TEXT&limit=NUMBER**
  - **Description**: Search for snippets using hybrid semantic + keyword search.
  - **Query**: 
    - `q` (required string) - search query text
    - `limit` (optional number, defaults to 10) - maximum results to return
  - **Response**:
    ```json
    {
      "results": [
        {
          "bookId": 1,
          "bookTitle": "...",
          "bookAuthor": "...",
          "snippetId": 10,
          "snippetText": "...",
          "reason": "...",
          "sentenceText": "...",
          "originalTextWithIndices": "...",
          "textToSearch": "first 8 words...",
          "themes": ["theme1", "theme2"],
          "startSentence": 12,
          "endSentence": 18
        }
      ]
    }
    ```
  Note: Combines semantic search (70% weight via embeddings) with keyword search (30% weight via full-text) to find relevant snippets by meaning and text. Results are ranked by relevance.

- **GET /feed?limit=NUMBER**
  - **Description**: Get feed of snippet cards with random sampling.
  - **Query**: `limit` (optional number, defaults to 10)
  - **Response**:
    ```json
    {
      "items": [
        {
          "bookId": 1,
          "bookTitle": "...",
          "bookAuthor": "...",
          "snippetId": 10,
          "snippetText": "...",
          "reason": "...",
          "sentenceText": "...",
          "originalTextWithIndices": "...",
          "textToSearch": "first 8 words...",
          "themes": ["theme1", "theme2"],
          "startSentence": 12,
          "endSentence": 18
        }
      ]
    }
    ```
  Note: Returns a random sample of snippets. Each request returns a different random set.

- **GET /feed/book/:bookId?limit=NUMBER**
  - **Description**: Get feed filtered by book with random sampling.
  - **Params**: `bookId` (number)
  - **Query**: `limit` (optional number, defaults to 10)
  - **Response**: Same shape as `GET /feed`.
  Note: Returns a random sample of snippets from the specified book.

- **GET /feed/theme/:theme?limit=NUMBER**
  - **Description**: Get feed filtered by theme with random sampling.
  - **Params**: `theme` (string)
  - **Query**: `limit` (optional number, defaults to 10)
  - **Response**: Same shape as `GET /feed`.
  Note: Returns a random sample of snippets matching the specified theme.
