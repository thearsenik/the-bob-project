# the-bob-project
Rien à dire, tout à faire.

## Configuration

Before running the application, you need to create a `config.json` file in the root directory. You can use `config.json.example` as a template.

```json
{
  "username": "YOUR_USERNAME",
  "password": "YOUR_PASSWORD",
  "apiKey": "YOUR_API_KEY",
  "accountType": "demo",
  "mongodb_uri": "YOUR_MONGODB_URI"
}
```

- `username`: Your IG username.
- `password`: Your IG password.
- `apiKey`: Your IG API key.
- `accountType`: `demo` or `live`.
- `mongodb_uri`: The connection string for your MongoDB database.
