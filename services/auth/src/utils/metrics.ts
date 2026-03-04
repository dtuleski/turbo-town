import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({});

const NAMESPACE = 'MemoryGame/AuthService';

export enum MetricName {
  REQUEST_COUNT = 'RequestCount',
  ERROR_COUNT = 'ErrorCount',
  LATENCY = 'Latency',
  TOKEN_GENERATION_TIME = 'TokenGenerationTime',
  COGNITO_OPERATION_TIME = 'CognitoOperationTime',
  DYNAMODB_OPERATION_TIME = 'DynamoDBOperationTime',
  REGISTRATION_COUNT = 'RegistrationCount',
  LOGIN_COUNT = 'LoginCount',
  FAILED_LOGIN_COUNT = 'FailedLoginCount',
  PASSWORD_RESET_COUNT = 'PasswordResetCount',
}

interface MetricData {
  name: MetricName;
  value: number;
  unit?: 'Count' | 'Milliseconds' | 'Seconds';
  dimensions?: Record<string, string>;
}

class MetricsPublisher {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
  }

  async publishMetric(data: MetricData): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const dimensions = Object.entries(data.dimensions || {}).map(([name, value]) => ({
        Name: name,
        Value: value,
      }));

      const command = new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [
          {
            MetricName: data.name,
            Value: data.value,
            Unit: data.unit || 'Count',
            Timestamp: new Date(),
            Dimensions: dimensions.length > 0 ? dimensions : undefined,
          },
        ],
      });

      await cloudwatch.send(command);
    } catch (error) {
      // Don't fail the request if metrics publishing fails
      console.error('Failed to publish metric:', error);
    }
  }

  async publishCount(name: MetricName, count: number = 1, dimensions?: Record<string, string>): Promise<void> {
    await this.publishMetric({
      name,
      value: count,
      unit: 'Count',
      dimensions,
    });
  }

  async publishLatency(name: MetricName, milliseconds: number, dimensions?: Record<string, string>): Promise<void> {
    await this.publishMetric({
      name,
      value: milliseconds,
      unit: 'Milliseconds',
      dimensions,
    });
  }

  // Helper to measure operation time
  async measureTime<T>(
    operation: () => Promise<T>,
    metricName: MetricName,
    dimensions?: Record<string, string>,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      await this.publishLatency(metricName, duration, dimensions);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.publishLatency(metricName, duration, { ...dimensions, error: 'true' });
      throw error;
    }
  }
}

// Singleton instance
export const metrics = new MetricsPublisher();
