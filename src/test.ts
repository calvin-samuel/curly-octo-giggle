import { WeeklySummaryGenerator } from './index';
import { SecretManagerService } from './services/secrets';
import { WeeklySummaryService } from './services/gemini';

console.log('Starting test script...');

async function testWeeklySummary() {
  // Replace with your Google Cloud Project ID
  const projectId = 'tech-ops-production'; // Replace with your actual Google Cloud project ID
  const secretManager = new SecretManagerService(projectId);
  
  // Hardcoded values for Notion database ID and Slack channel
  const notionDatabaseId = '1bd53cae7a66804cb429c4e34229664d'; // Your Notion database ID
  const slackChannel = 'C07EKPTLEPK'; // Your Slack channel name
  
  // Load secrets from Google Cloud Secret Manager
  const [notionKey, slackToken, openaiKey] = await Promise.all([
    secretManager.getSecret('notion_api_gcp_integrations'),
    secretManager.getSecret('slack-community-bot'),
    secretManager.getSecret('openai_token_hackathon')
  ]);

  const config = {
    notionKey,
    notionDatabaseId,
    slackToken,
    slackChannel,
    openaiKey,
    dryRun: false // Set to true if you want to test without sending to Slack
  };

  try {
    console.log('Starting weekly summary generation...');
    const generator = new WeeklySummaryGenerator(config);
    const results = await generator.generateWeeklySummary();
    
    console.log('Weekly Summary Results:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error generating weekly summary:', error);
  }
}

// Run the test
testWeeklySummary(); 