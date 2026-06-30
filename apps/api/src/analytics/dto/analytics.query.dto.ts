import { IsDateString, IsOptional, IsString } from 'class-validator';

export class OverviewQueryDto {
  @IsString()
  locationId!: string;
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
