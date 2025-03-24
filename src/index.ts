import { v4 as uuidv4 } from 'uuid';
import { NotionService } from './services/notion';
import { WeeklySummaryService } from './services/gemini';
import { SlackService } from './services/slack';
import { WeeklySummaryConfig, ProcessingResult } from './types';
import { SecretManagerService } from './services/secrets';

// Configuration constants
const CONFIG = {
  PROJECT_ID: 'tech-ops-production',
  NOTION_DATABASE_ID: '1bd53cae7a66804cb429c4e34229664d',
  SLACK_CHANNEL: 'C07EKPTLEPK',
  SECRET_NAMES: {
    NOTION_API: 'notion_api_gcp_integrations',
    SLACK_TOKEN: 'slack-community-bot',
    OPENAI_TOKEN: 'openai_token_hackathon'
  }
};

export class WeeklySummaryGenerator {
  private notionService: NotionService;
  private weeklySummaryService: WeeklySummaryService;
  private slackService: SlackService;
  private config: WeeklySummaryConfig;

  constructor(config: WeeklySummaryConfig) {
    this.config = config;
    this.notionService = new NotionService(config.notionKey, config.notionDatabaseId);
    this.weeklySummaryService = new WeeklySummaryService(config.openaiKey);
    this.slackService = new SlackService(config.slackToken, config.slackChannel);
  }

  async generateWeeklySummary(): Promise<ProcessingResult[]> {
    try {
      const entries = await this.notionService.getActiveEntries();
      const results: ProcessingResult[] = [];

      for (const entry of entries) {
        if (this.config.dryRun) {
          results.push({
            success: true,
            traceId: uuidv4()
          });
          continue;
        }

        try {
          if (!entry.content) {
            console.error('No content found for entry:', entry.id);
            results.push({
              success: false,
              error: 'No content found in page'
            });
            continue;
          }

          const slackBlocks = JSON.parse(await this.weeklySummaryService.generateSlackMessage(entry.content, entry.url));
          const slackSuccess = await this.slackService.sendMessage(slackBlocks);

          if (slackSuccess) {
            const traceId = uuidv4();
            const updateResult = await this.notionService.updateEntryStatus(entry.id, traceId);
            results.push(updateResult);
          } else {
            results.push({
              success: false,
              error: 'Failed to send message to Slack'
            });
          }
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to generate weekly summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Cloud Function entry point
export const weeklySummary = async (req: any, res: any) => {
  try {
    // Initialize Secret Manager
    const secretManager = new SecretManagerService(CONFIG.PROJECT_ID);
    
    // Load secrets from Google Cloud Secret Manager
    const [notionKey, slackToken, openaiKey] = await Promise.all([
      secretManager.getSecret(CONFIG.SECRET_NAMES.NOTION_API),
      secretManager.getSecret(CONFIG.SECRET_NAMES.SLACK_TOKEN),
      secretManager.getSecret(CONFIG.SECRET_NAMES.OPENAI_TOKEN)
    ]);

    const config = {
      notionKey,
      notionDatabaseId: CONFIG.NOTION_DATABASE_ID,
      slackToken,
      slackChannel: CONFIG.SLACK_CHANNEL,
      openaiKey,
      dryRun: req.body?.dry_run || false
    };

    const generator = new WeeklySummaryGenerator(config);
    const results = await generator.generateWeeklySummary();

    res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error in weeklySummary function:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}; 