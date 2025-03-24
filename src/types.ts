export interface NotionEntry {
  id: string;
  url: string;
  content: string;
  properties: {
    'Week commencing': {
      date: {
        start: string;
        end: string;
      };
    };
    'Sent to Slack'?: {
      checkbox: boolean;
    };
    'Trace ID'?: {
      rich_text: Array<{
        plain_text: string;
      }>;
    };
  };
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks: any[];
}

export interface WeeklySummaryConfig {
  notionKey: string;
  notionDatabaseId: string;
  slackToken: string;
  slackChannel: string;
  openaiKey: string;
  dryRun?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  error?: string;
  traceId?: string;
} 