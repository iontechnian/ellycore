import { Injectable, NotFoundException } from "@nestjs/common";
import { SourceService } from "../source/source.service.ts";
import { CreateFragmentDTO, UpdateFragmentDTO, FragmentResponseDTO, FragmentListResponseDTO } from "./fragment.dtos.ts";
import { DatabaseService, SqlParams } from "../database/database.service.ts";
import { v4 as uuid } from "uuid";
import { Sandbox} from "@ellycore/fragments-runtime"
import { join } from "@std/path";

@Injectable()
export class FragmentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sourceService: SourceService,
  ) {}

  async create(createFragmentDto: CreateFragmentDTO): Promise<FragmentResponseDTO> {
    const { name, description, source } = createFragmentDto;
    const id = uuid();
  
    await this.sourceService.writeFile(id, source);
    
    await this.databaseService.run(
      'INSERT INTO fragments (id, name, description, source) VALUES ($id, $name, $description, $source)',
      { 
        $id: id,
        $name: name,
        $description: description || null,
        $source: id, // Store the ID instead of the source code
       }
    );
    
    const fragment = await this.databaseService.get<any>(
      'SELECT id, name, description, source, createdAt, updatedAt FROM fragments WHERE id = $id',
      { $id: id }
    );
    
    if (!fragment) {
      throw new NotFoundException(`Fragment with ID ${id} not found`);
    }
    
    
    const sourceContent = await this.sourceService.readFile(fragment.source);
    return mapToFragmentResponse(fragment, sourceContent || '');
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
    
    const sourceContent = await this.sourceService.readFile(fragment.source);
    return mapToFragmentResponse(fragment, sourceContent || '');
  }

  async update(id: string, updateFragmentDto: UpdateFragmentDTO): Promise<FragmentResponseDTO> {
    const currentFragment = await this.databaseService.get<any>(
      'SELECT id, source FROM fragments WHERE id = $id',
      { $id: id }
    );
    
    if (!currentFragment) {
      throw new NotFoundException(`Fragment with ID ${id} not found`);
    }
    
    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const params: SqlParams = { $id: id };
    
    if (updateFragmentDto.name !== undefined) {
      updates.push('name = $name');
      params.$name = updateFragmentDto.name;
    }
    
    if (updateFragmentDto.description !== undefined) {
      updates.push('description = $description');
      params.$description = updateFragmentDto.description;
    }
    
    if (updateFragmentDto.source !== undefined) {
      await this.sourceService.writeFile(currentFragment.source, updateFragmentDto.source);
    }
    
    updates.push('updatedAt = CURRENT_TIMESTAMP');
    
    if (updates.length > 0) {
      await this.databaseService.run(
        `UPDATE fragments SET ${updates.join(', ')} WHERE id = $id`,
        params
      );
    }
    
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const fragment = await this.databaseService.get<any>(
      'SELECT id, source FROM fragments WHERE id = $id',
      { $id: id }
    );
    
    if (!fragment) {
      throw new NotFoundException(`Fragment with ID ${id} not found`);
    }
    
    await this.sourceService.deleteFile(fragment.source);
    
    const result = await this.databaseService.run(
      'DELETE FROM fragments WHERE id = $id', 
      { $id: id }
    );
    
    if (result.changes === 0) {
      throw new NotFoundException(`Fragment with ID ${id} not found`);
    }
  }

  async run(id: string, args: any[]): Promise<any> {
    const _fragment = await this.findOne(id);
    const sandbox = new Sandbox({
      memory: 300,
      pathToScript: join(Deno.cwd(), this.sourceService.getFilePath(id)),
      bindings: {},
      timeLimitSeconds: 10,
      debug: true,
    });
    const execution = sandbox.createExecution(args);
    execution.on("stdout", (data) => {
      console.log(data);
    });
    execution.on("stderr", (data) => {
      console.error(data);
    });
    return execution.run();
  }
}


function mapToFragmentResponse(dbFragment: any, sourceContent?: string): FragmentResponseDTO {
  return {
    id: dbFragment.id.toString(),
    name: dbFragment.name,
    description: dbFragment.description,
    source: sourceContent || undefined,
    createdAt: new Date(dbFragment.createdAt),
    updatedAt: new Date(dbFragment.updatedAt)
  };
}
