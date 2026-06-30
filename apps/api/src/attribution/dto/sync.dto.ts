import { IsString } from 'class-validator';

export class SyncNowDto {
  @IsString()
  locationId!: string;
}
