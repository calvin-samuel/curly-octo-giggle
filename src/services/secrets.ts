import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export class SecretManagerService {
  private client: SecretManagerServiceClient;
  private projectId: string;
  private secretCache: Map<string, string> = new Map();

  constructor(projectId: string) {
    this.client = new SecretManagerServiceClient();
    this.projectId = projectId;
  }

  async getSecret(secretName: string, version = 'latest'): Promise<string> {
    // Check cache first
    const cacheKey = `${secretName}-${version}`;
    if (this.secretCache.has(cacheKey)) {
      return this.secretCache.get(cacheKey)!;
    }

    const name = `projects/${this.projectId}/secrets/${secretName}/versions/${version}`;
    
    try {
      const [response] = await this.client.accessSecretVersion({ name });
      const secretValue = response.payload?.data?.toString() || '';
      
      // Cache the result
      this.secretCache.set(cacheKey, secretValue);
      
      return secretValue;
    } catch (error) {
      throw new Error(`Failed to access secret ${secretName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 