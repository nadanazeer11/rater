import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class OverviewQueryDto {
  @IsString()
  locationId!: string;
}

export class SentimentTrendQueryDto {
  @IsString()
  locationId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;
}

export class FunnelQueryDto {
  @IsString()
  locationId!: string;

  /** ISO date — inclusive lower bound on ReviewRequest.createdAt. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** ISO date — inclusive upper bound on ReviewRequest.createdAt. */
  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;
}
