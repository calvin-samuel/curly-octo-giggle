# Weekly Summary Generator

An automated system that generates weekly summaries from Notion entries using Gemini AI and delivers them to Slack.

## Features

- Queries Notion database for active entries
- Processes text through Gemini AI
- Delivers formatted summaries to Slack
- Updates source records with status
- Supports dry run mode for testing
- Includes retry mechanism for failed operations

## Prerequisites

- Node.js 18 or later
- Google Cloud Platform account
- Notion API key
- Slack Bot Token
- Gemini API key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd people-weekly
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
NOTION_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_database_id
SLACK_TOKEN=your_slack_bot_token
SLACK_CHANNEL=your_slack_channel
GEMINI_KEY=your_gemini_api_key
```

## Development

1. Build the project:
```bash
npm run build
```

2. Run tests:
```bash
npm test
```

3. Run linting:
```bash
npm run lint
```

## Deployment

1. Deploy to Google Cloud Functions:
```bash
gcloud functions deploy weekly-summary \
  --runtime nodejs18 \
  --trigger-http \
  --set-env-vars NOTION_KEY=<secret>,SLACK_TOKEN=<secret>,GEMINI_KEY=<secret>,NOTION_DATABASE_ID=<id>,SLACK_CHANNEL=<channel>
```

2. Set up Cloud Scheduler:
```bash
gcloud scheduler jobs create http weekly-summary-job \
  --schedule "0 9 * * 5" \
  --http-method POST \
  --uri <function-url> \
  --oidc-service-account-email <service-account-email>
```

## Testing

You can test the function using the dry run mode:

```bash
curl -X POST <function-url> \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{"dry_run":true}'
```

## Error Handling

The system includes:
- Retry mechanism for Slack message delivery
- Error tracking for failed operations
- Dry run mode for testing
- Detailed error reporting in responses

## Security

- API keys are stored in Google Cloud Secret Manager
- IAM roles with least privilege
- Request validation
- Secure environment variable handling

## Monitoring

Monitor the function's execution through:
- Google Cloud Logging
- Cloud Function metrics
- Slack error notifications 