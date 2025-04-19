import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus } from "@nestjs/common";
import { FragmentService } from "./fragment.service.ts";
import { CreateFragmentDTO, UpdateFragmentDTO, FragmentResponseDTO, FragmentListResponseDTO } from "./fragment.dtos.ts";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from "@nestjs/swagger";

@ApiTags('Fragments')
@Controller('fragment')
export class FragmentController {
    constructor(private readonly fragmentService: FragmentService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new fragment' })
    @ApiBody({ type: CreateFragmentDTO, description: 'Fragment data' })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'The fragment has been successfully created.',
        type: FragmentResponseDTO
    })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
    create(@Body() createFragmentDto: CreateFragmentDTO): Promise<FragmentResponseDTO> {
        return this.fragmentService.create(createFragmentDto);
    }

    @Get()
    @ApiOperation({ summary: 'Retrieve all fragments with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', type: Number, example: 10 })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'List of fragments retrieved successfully.',
        type: FragmentListResponseDTO
    })
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10
    ): Promise<FragmentListResponseDTO> {
        return this.fragmentService.findAll(page, limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a fragment by ID' })
    @ApiParam({ name: 'id', description: 'Fragment ID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Fragment retrieved successfully.',
        type: FragmentResponseDTO
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fragment not found.' })
    findOne(@Param('id') id: string): Promise<FragmentResponseDTO> {
        return this.fragmentService.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a fragment' })
    @ApiParam({ name: 'id', description: 'Fragment ID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiBody({ type: UpdateFragmentDTO, description: 'Updated fragment data' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Fragment updated successfully.',
        type: FragmentResponseDTO
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fragment not found.' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
    update(
        @Param('id') id: string,
        @Body() updateFragmentDto: UpdateFragmentDTO
    ): Promise<FragmentResponseDTO> {
        return this.fragmentService.update(id, updateFragmentDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a fragment' })
    @ApiParam({ name: 'id', description: 'Fragment ID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Fragment deleted successfully.'
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fragment not found.' })
    remove(@Param('id') id: string): Promise<void> {
        return this.fragmentService.remove(id);
    }
}