"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretManagerService = void 0;
const secret_manager_1 = require("@google-cloud/secret-manager");
class SecretManagerService {
    constructor(projectId) {
        this.secretCache = new Map();
        this.client = new secret_manager_1.SecretManagerServiceClient();
        this.projectId = projectId;
    }
    async getSecret(secretName, version = 'latest') {
        // Check cache first
        const cacheKey = `${secretName}-${version}`;
        if (this.secretCache.has(cacheKey)) {
            return this.secretCache.get(cacheKey);
        }
        const name = `projects/${this.projectId}/secrets/${secretName}/versions/${version}`;
        try {
            const [response] = await this.client.accessSecretVersion({ name });
            const secretValue = response.payload?.data?.toString() || '';
            // Cache the result
            this.secretCache.set(cacheKey, secretValue);
            return secretValue;
        }
        catch (error) {
            throw new Error(`Failed to access secret ${secretName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.SecretManagerService = SecretManagerService;
