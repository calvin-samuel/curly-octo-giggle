import OpenAI from 'openai';

interface WeeklySummaryContent {
  title: string;
  summary: string;
  highlights: string[];
  question: string;
  imagePrompt: string;
}

export class WeeklySummaryService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  private async generateImage(prompt: string): Promise<string> {
    try {
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: `Create a wide banner image: ${prompt}. The image should be suitable for a header or banner, with a 16:9 aspect ratio.`,
        n: 1,
        size: "1792x1024", // 16:9 aspect ratio for banner
        quality: "standard",
        style: "natural"
      });

      if (response.data && response.data[0]?.url) {
        return response.data[0].url;
      }
      throw new Error('No image URL in response');
    } catch (error) {
      console.error('Failed to generate image:', error);
      return ''; // Return empty string if image generation fails
    }
  }

  private async createSlackMessage(content: WeeklySummaryContent, pageUrl: string): Promise<string> {
    // Generate cover image
    const imageUrl = await this.generateImage(content.imagePrompt);

    return JSON.stringify({
      text: content.title,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "People Weekly Updates 🎉"
          }
        },
        ...(imageUrl ? [{
          type: "image",
          title: {
            type: "plain_text",
            text: "Weekly Summary Banner"
          },
          image_url: imageUrl,
          alt_text: "Weekly Summary Banner Image"
        }] : []),
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `📝 *Summary*\n${content.summary}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `✨ *Key Highlights*\n${content.highlights.map(h => `• ${h}`).join('\n')}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `💭 *Let's Discuss*\n${content.question}`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🔗 *View in Notion*"
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Open Notion Page",
              emoji: true
            },
            value: pageUrl,
            action_id: "open_notion_page",
            url: pageUrl
          }
        }
      ]
    });
  }

  async generateSlackMessage(text: string, pageUrl: string): Promise<string> {
    const prompt = `Generate an engaging weekly summary from this text: 
${text}

Context: This content is from a Notion page at ${pageUrl}

Requirements:
1. Return ONLY a valid JSON object with the following structure:
{
  "title": "A catchy title with an emoji",
  "summary": "A brief, engaging summary of the main points",
  "highlights": ["List of 3-5 key highlights"],
  "question": "An engaging question to spark conversation",
  "imagePrompt": "A detailed prompt for generating a professional banner image that represents the overall theme of this week's updates. The image should be suitable for a header or banner."
}

2. Make the content fun and engaging
3. Focus on the most important updates
4. Include emojis where appropriate
5. Keep the highlights concise and impactful
6. Make the question relevant to the content
7. Provide a detailed image prompt that will generate a professional, thematic banner image
8. Limit to 3-5 highlights to avoid overwhelming the message
9. Use emojis in the highlights and question to make them more engaging`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional content creator who creates engaging weekly summaries. Always respond with valid JSON. Use emojis to make the content more engaging and fun."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      console.log('Raw OpenAI response:', response);

      // Parse and validate the content
      try {
        const content: WeeklySummaryContent = JSON.parse(response);
        
        // Validate required fields
        if (!content.title || !content.summary || !Array.isArray(content.highlights) || !content.question || !content.imagePrompt) {
          throw new Error('Missing required fields in content');
        }

        // Create the Slack message using our template
        return this.createSlackMessage(content, pageUrl);
      } catch (parseError) {
        console.error('Invalid JSON response:', response);
        throw new Error('Generated response is not valid content format');
      }
    } catch (error) {
      throw new Error(`Failed to generate Slack message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 