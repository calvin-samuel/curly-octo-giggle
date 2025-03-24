"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionService = void 0;
const client_1 = require("@notionhq/client");
class NotionService {
    constructor(apiKey, databaseId) {
        this.client = new client_1.Client({ auth: apiKey });
        this.databaseId = databaseId;
    }
    async getPageContent(pageId) {
        const response = await this.client.blocks.children.list({
            block_id: pageId
        });
        let content = '';
        for (const block of response.results) {
            if ('paragraph' in block && block.paragraph.rich_text.length > 0) {
                content += block.paragraph.rich_text.map(text => text.plain_text).join('') + '\n';
            }
        }
        return content.trim();
    }
    async getActiveEntries() {
        const today = new Date().toISOString().split('T')[0];
        const response = await this.client.databases.query({
            database_id: this.databaseId,
            filter: {
                and: [
                    {
                        property: 'Week commencing',
                        date: {
                            on_or_before: today
                        }
                    },
                    {
                        property: 'Week commencing',
                        date: {
                            on_or_after: today
                        }
                    }
                ]
            }
        });
        const entries = await Promise.all(response.results.map(async (page) => {
            const content = await this.getPageContent(page.id);
            console.log('Page Content:', content); // Debug log
            return {
                id: page.id,
                url: `https://www.notion.so/${page.id.replace(/-/g, '')}`,
                content,
                properties: {
                    'Week commencing': page.properties['Week commencing'],
                    'Sent to Slack': page.properties['Sent to Slack'],
                    'Trace ID': page.properties['Trace ID']
                }
            };
        }));
        return entries;
    }
    async updateEntryStatus(pageId, traceId) {
        try {
            await this.client.pages.update({
                page_id: pageId,
                properties: {
                    'Sent to Slack': { checkbox: true },
                    'Trace ID': {
                        rich_text: [{ text: { content: traceId } }]
                    }
                }
            });
            return { success: true, traceId };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}
exports.NotionService = NotionService;
