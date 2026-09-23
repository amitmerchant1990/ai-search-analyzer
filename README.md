# AI Search Visibility Analyzer

Small Node.js app for comparing a domain's presence in Google AI Mode and regular Google results for a set of queries.

## Run locally

Set the server-side key.

```sh
export SEARCHAPI_API_KEY=your_key_here
```

Start the app.

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000).

The start script loads `.env` automatically. Restart the server after changing the key.

Run the tests with `npm test`.

This is intentionally a one-time analyzer. It does not store runs or provide historical/scheduled tracking yet. Search results are live and can vary by query, location, language, and time.

## License

MIT
