import { Injectable, NotFoundException } from "@nestjs/common";
import { SourceService } from "../source/source.service.ts";
import { CreateFragmentDTO, UpdateFragmentDTO, FragmentResponseDTO, FragmentListResponseDTO } from "./fragment.dtos.ts";
import { DatabaseService, SqlParams } from "../database/database.service.ts";
import { v4 as uuid } from "uuid";

@Injectable()
export class FragmentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sourceService: SourceService,
  ) {}

  async create(createFragmentDto: CreateFragmentDTO): Promise<FragmentResponseDTO> {
    const { name, description, source } = createFragmentDto;
    const id = uuid();
    
    await this.databaseService.run(
      'INSERT INTO fragments (id, name, description, source) VALUES ($id, $name, $description, $source)',
      { 
        $id: id,
        $name: name,
        $description: description || null,
        $source: source,
       }
    );
    
    const fragment = await this.databaseService.get<any>(
      'SELECT id, name, description, source, createdAt, updatedAt FROM fragments WHERE id = $id',
      { $id: id }
    );
    
    if (!fragment) {
      throw new NotFoundException(`Fragment with ID ${id} not found`);
    }
    
    return mapToFragmentResponse(fragment);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<FragmentListResponseDTO> {
    const offset = (page - 1) * limit;
    
    const fragments = await this.databaseService.all<any>(
      'SELECT id, name, description, source, createdAt, updatedAt FROM fragments LIMIT $limit OFFSET $offset',
      { $limit: limit, $offset: offset }
    );
    
    const countResult = await this.databaseService.get<{total: number}>(
      'SELECT COUNT(*) as total FROM fragments'
    );
    const total = countResult.total;
    
    return {
      fragments: fragments.map(row => mapToFragmentResponse(row)),
      total,
      page,
      limit
    };
  }

  async findOne(id: string): Promise<FragmentResponseDTO> {
    const fragment = await this.databaseService.get<any>(
      'SELECT id, name, description, source, createdAt, updatedAt FROM fragments WHERE id = $id',
      { $id: id }
    );
    
    if (!fragment) {
      throw new NotFoundException(`Fragment with ID ${id} not found`);
    }
    
    return mapToFragmentResponse(fragment);
  }

  async update(id: string, updateFragmentDto: UpdateFragmentDTO): Promise<FragmentResponseDTO> {
    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const params: SqlParams = { id };
    
    if (updateFragmentDto.name !== undefined) {
      updates.push('name = $1ame');
      params.name = updateFragmentDto.name;
    }
    
    if (updateFragmentDto.description !== undefined) {
      updates.push('description = $1escription');
      params.description = updateFragmentDto.description;
    }
    
    if (updateFragmentDto.source !== undefined) {
      updates.push('source = $1ource');
      params.source = updateFragmentDto.source;
    }
    
    // Add updatedAt timestamp
    updates.push('updatedAt = CURRENT_TIMESTAMP');
    
    // If no fields to update, just return the current fragment
    if (Object.keys(params).length === 1) { // Only 'id' is present
      return this.findOne(id);
    }
    
    const result = await this.databaseService.run(
      `UPDATE fragments SET ${updates.join(', ')} WHERE id = $id`,
      params
    );
    
    if (result.changes === 0) {
      throw new NotFoundException(`Fragment with ID ${id} not found`);
    }
    
    // Get the updated fragment
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.databaseService.run(
      'DELETE FROM fragments WHERE id = $id', 
      { $id: id }
    );
    
    if (result.changes === 0) {
      throw new NotFoundException(`Fragment with ID ${id} not found`);
    }
  }
}

function mapToFragmentResponse(dbFragment: any): FragmentResponseDTO {
  return {
    id: dbFragment.id.toString(),
    name: dbFragment.name,
    description: dbFragment.description,
    source: dbFragment.source,
    createdAt: new Date(dbFragment.createdAt),
    updatedAt: new Date(dbFragment.updatedAt)
  };
}
