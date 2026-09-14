import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateWebhookEndpointDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  eventTypes: string[];
}
