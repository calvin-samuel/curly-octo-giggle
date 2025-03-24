"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackService = void 0;
const web_api_1 = require("@slack/web-api");
class SlackService {
    constructor(token, channel) {
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.client = new web_api_1.WebClient(token);
        this.channel = channel;
    }
    async sendMessage(message) {
        const slackMessage = {
            channel: this.channel,
            text: message.text,
            blocks: message.blocks
        };
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await this.client.chat.postMessage(slackMessage);
                return result.ok;
            }
            catch (error) {
                if (attempt === this.maxRetries) {
                    throw new Error(`Failed to send Slack message after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }
        return false;
    }
}
exports.SlackService = SlackService;
