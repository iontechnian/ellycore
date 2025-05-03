import { Injectable, OnModuleInit } from "@nestjs/common";

@Injectable()
export class SourceService implements OnModuleInit {
  private readonly sourceDir = "data/source";

  /**
   * Initialize the service when the module is initialized
   */
  async onModuleInit(): Promise<void> {
    await this.ensureSourceDir();
  }

  /**
   * Ensures the source directory exists
   */
  private async ensureSourceDir(): Promise<void> {
    try {
      const info = await Deno.stat(this.sourceDir);
      if (!info.isDirectory) {
        await Deno.mkdir(this.sourceDir, { recursive: true });
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        await Deno.mkdir(this.sourceDir, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Gets the full path for a source file based on its ID
   */
  getFilePath(id: string): string {
    return `${this.sourceDir}/${id}.ts`;
  }

  /**
   * Writes content to a TypeScript file with the given ID
   */
  async writeFile(id: string, content: string): Promise<void> {
    await this.ensureSourceDir();
    const filePath = this.getFilePath(id);
    await Deno.writeTextFile(filePath, content);
  }

  /**
   * Reads the content of a TypeScript file with the given ID
   * Returns null if the file doesn't exist
   */
  async readFile(id: string): Promise<string | null> {
    const filePath = this.getFilePath(id);
    
    try {
      return await Deno.readTextFile(filePath);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Deletes a TypeScript file with the given ID
   * Returns true if deleted, false if file didn't exist
   */
  async deleteFile(id: string): Promise<boolean> {
    const filePath = this.getFilePath(id);
    
    try {
      await Deno.remove(filePath);
      return true;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return false;
      }
      throw error;
    }
  }
}