import { WebClient } from '@slack/web-api';
import { SlackMessage } from '../types';

export class SlackService {
  private client: WebClient;
  private channel: string;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(token: string, channel: string) {
    this.client = new WebClient(token);
    this.channel = channel;
  }

  async sendMessage(message: any): Promise<boolean> {
    const slackMessage: SlackMessage = {
      channel: this.channel,
      text: message.text,
      blocks: message.blocks
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.client.chat.postMessage(slackMessage);
        return result.ok;
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw new Error(`Failed to send Slack message after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }

    return false;
  }
} 