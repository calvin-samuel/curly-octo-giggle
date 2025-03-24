"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weeklySummary = exports.WeeklySummaryGenerator = void 0;
const uuid_1 = require("uuid");
const notion_1 = require("./services/notion");
const gemini_1 = require("./services/gemini");
const slack_1 = require("./services/slack");
const secrets_1 = require("./services/secrets");
class WeeklySummaryGenerator {
    constructor(config) {
        this.config = config;
        this.notionService = new notion_1.NotionService(config.notionKey, config.notionDatabaseId);
        this.weeklySummaryService = new gemini_1.WeeklySummaryService(config.openaiKey);
        this.slackService = new slack_1.SlackService(config.slackToken, config.slackChannel);
    }
    async generateWeeklySummary() {
        try {
            const entries = await this.notionService.getActiveEntries();
            const results = [];
            for (const entry of entries) {
                if (this.config.dryRun) {
                    results.push({
                        success: true,
                        traceId: (0, uuid_1.v4)()
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
                        const traceId = (0, uuid_1.v4)();
                        const updateResult = await this.notionService.updateEntryStatus(entry.id, traceId);
                        results.push(updateResult);
                    }
                    else {
                        results.push({
                            success: false,
                            error: 'Failed to send message to Slack'
                        });
                    }
                }
                catch (error) {
                    results.push({
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error occurred'
                    });
                }
            }
            return results;
        }
        catch (error) {
            throw new Error(`Failed to generate weekly summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.WeeklySummaryGenerator = WeeklySummaryGenerator;
// Cloud Function entry point
const weeklySummary = async (req, res) => {
    try {
        // Get the Google Cloud project ID from the environment
        const projectId = process.env.GOOGLE_CLOUD_PROJECT || '';
        if (!projectId) {
            throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set');
        }
        // Hardcoded values for Notion database ID and Slack channel
        const notionDatabaseId = 'your-notion-database-id'; // Replace with your actual database ID
        const slackChannel = 'your-slack-channel'; // Replace with your actual channel name
        // Initialize Secret Manager
        const secretManager = new secrets_1.SecretManagerService(projectId);
        // Load secrets from Google Cloud Secret Manager
        const [notionKey, slackToken, openaiKey] = await Promise.all([
            secretManager.getSecret('notion_api_gcp_integrations'),
            secretManager.getSecret('SLACK_TOKEN'),
            secretManager.getSecret('openai_token_hackathon')
        ]);
        const config = {
            notionKey,
            notionDatabaseId,
            slackToken,
            slackChannel,
            openaiKey,
            dryRun: req.body?.dry_run || false
        };
        const generator = new WeeklySummaryGenerator(config);
        const results = await generator.generateWeeklySummary();
        res.status(200).json({
            success: true,
            results
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};
exports.weeklySummary = weeklySummary;
