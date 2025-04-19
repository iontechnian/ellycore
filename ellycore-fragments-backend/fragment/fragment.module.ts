import { Module, OnModuleInit } from "@nestjs/common";
import sqlite3 from "sqlite3";
import { promisify } from "node:util";
import { SourceModule } from "../source/source.module.ts";
import { FragmentService } from "./fragment.service.ts";
import { FragmentController } from "./fragment.controller.ts";
import { DatabaseModule } from "../database/database.module.ts";

@Module({
    imports: [
        SourceModule,
        DatabaseModule,
    ],
    providers: [
        FragmentService,
    ],
    controllers: [
        FragmentController,
    ],
})
export class FragmentModule implements OnModuleInit {
    constructor(private readonly database: sqlite3.Database) {}

    async onModuleInit() {
        const exec = promisify(this.database.exec).bind(this.database);
        await exec(`
            CREATE TABLE IF NOT EXISTS fragments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                source TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }
}