import { Global, Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { SentimentClassifier } from './sentiment.classifier';

@Global()
@Module({
  providers: [AnthropicService, SentimentClassifier],
  exports: [AnthropicService, SentimentClassifier],
})
export class AiModule {}
