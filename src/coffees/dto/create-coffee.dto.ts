import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCoffeeDto {
  @ApiProperty({ description: 'the name of a coffee' })
  @IsString()
  readonly name: string;

  @ApiProperty({ description: 'the brand of a coffee' })
  @IsString()
  readonly brand: string;

  @ApiProperty({ examples: [] })
  @IsString({ each: true })
  readonly flavors: string[];
}
