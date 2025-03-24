import { Client } from '@notionhq/client';
import { NotionEntry, ProcessingResult } from '../types';

export class NotionService {
  private client: Client;
  private databaseId: string;

  constructor(apiKey: string, databaseId: string) {
    this.client = new Client({ auth: apiKey });
    this.databaseId = databaseId;
  }

  private async getPageContent(pageId: string): Promise<string> {
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

  async getActiveEntries(): Promise<NotionEntry[]> {
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

    const entries = await Promise.all(response.results.map(async page => {
      const content = await this.getPageContent(page.id);
      console.log('Page Content:', content); // Debug log
      
      return {
        id: page.id,
        url: `https://www.notion.so/${page.id.replace(/-/g, '')}`,
        content,
        properties: {
          'Week commencing': (page as any).properties['Week commencing'],
          'Sent to Slack': (page as any).properties['Sent to Slack'],
          'Trace ID': (page as any).properties['Trace ID']
        }
      };
    }));

    return entries as NotionEntry[];
  }

  async updateEntryStatus(
    pageId: string,
    traceId: string
  ): Promise<ProcessingResult> {
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
} 