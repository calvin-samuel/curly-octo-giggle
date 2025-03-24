import { NotionService } from '../notion';
import { Client } from '@notionhq/client';

// Mock the Notion client
jest.mock('@notionhq/client');

describe('NotionService', () => {
  let notionService: NotionService;
  let mockQuery: jest.Mock;
  let mockUpdate: jest.Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock functions
    mockQuery = jest.fn();
    mockUpdate = jest.fn();

    // Mock the Client constructor
    ((Client as unknown) as jest.Mock).mockImplementation(() => ({
      databases: {
        query: mockQuery
      },
      pages: {
        update: mockUpdate
      }
    }));

    notionService = new NotionService('test-key', 'test-db-id');
  });

  it('should get active entries', async () => {
    const mockResponse = {
      results: [{
        id: 'test-id',
        url: 'https://www.notion.so/testid',
        properties: {
          'Week commencing': { 
            date: { 
              start: '2024-03-15',
              end: '2024-03-21'
            } 
          },
          Stuff: { rich_text: [{ plain_text: 'Test content' }] },
          'Sent to Slack': { checkbox: false },
          'Trace ID': { rich_text: [] }
        }
      }]
    };

    mockQuery.mockResolvedValue(mockResponse);

    const entries = await notionService.getActiveEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('test-id');
  });
}); 