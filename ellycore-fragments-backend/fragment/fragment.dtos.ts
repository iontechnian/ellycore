import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateFragmentDTO {
    @ApiProperty({
        description: 'The name of the fragment',
        example: 'My Fragment'
    })
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ApiPropertyOptional({
        description: 'A description of the fragment',
        example: 'This fragment does something interesting'
    })
    @IsString() 
    description?: string;

    @ApiProperty({
        description: 'The source code of the fragment',
        example: 'function myFragment() { return "Hello, World!"; }'
    })
    @IsString()
    @IsNotEmpty()
    source!: string;
}

export class UpdateFragmentDTO extends PartialType(CreateFragmentDTO) {}

export class FragmentResponseDTO {
    @ApiProperty({
        description: 'The unique identifier of the fragment',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    id!: string;

    @ApiProperty({
        description: 'The name of the fragment',
        example: 'My Fragment'
    })
    name!: string;

    @ApiPropertyOptional({
        description: 'A description of the fragment',
        example: 'This fragment does something interesting'
    })
    description?: string;

    @ApiPropertyOptional({
        description: 'The source code of the fragment. Not included in list responses.',
        example: 'function myFragment() { return "Hello, World!"; }'
    })
    source?: string;

    @ApiProperty({
        description: 'The timestamp when the fragment was created',
        example: '2023-07-21T12:34:56.789Z'
    })
    createdAt!: Date;

    @ApiProperty({
        description: 'The timestamp when the fragment was last updated',
        example: '2023-07-22T10:11:12.345Z'
    })
    updatedAt!: Date;
}

export class FragmentListResponseDTO {
    @ApiProperty({
        description: 'An array of fragments',
        type: [FragmentResponseDTO]
    })
    fragments!: FragmentResponseDTO[];

    @ApiProperty({
        description: 'The total number of fragments',
        example: 42
    })
    total!: number;

    @ApiProperty({
        description: 'The current page number',
        example: 1
    })
    page!: number;

    @ApiProperty({
        description: 'The number of fragments per page',
        example: 10
    })
    limit!: number;
}