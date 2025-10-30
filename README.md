

## API Endpoints

- **GET /**
  - **Description**: Health check / hello endpoint.
  - **Response**:
    ```json
    "Hello World!"
    ```

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
      "fullSentence": "<joined sentences or empty>",
      "previousSentence": "<previous sentence or empty>",
      "nextSentence": "<next sentence or empty>"
    }
    ```

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
