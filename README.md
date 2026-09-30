# AI Search Visibility Analyzer

Small Node.js app for comparing a domain's presence in Google AI Mode and regular Google results for a set of queries.

## Run locally

Set the [Search API](https://www.searchapi.io/docs/google?utm_source=Dev&utm_medium=Ambassador&utm_campaign=amitmerchant.com) key.

```sh
export SEARCHAPI_API_KEY=your_key_here
```

Or set it in the `.env` file directly.

```
SEARCHAPI_API_KEY=your_key_here
```

Start the app.

```sh
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

The start script loads `.env` automatically. Restart the server after changing the key.

## Test

Run the tests with `npm test`.

## License

MIT
