import { Module } from "@nestjs/common";
import sqlite3 from "sqlite3";
import { DatabaseService } from "./database.service.ts";

@Module({
    providers: [
        {
            provide: sqlite3.Database,
            useFactory: () => new sqlite3.Database('./db.sqlite'),
        },
        DatabaseService
    ],
    exports: [
        sqlite3.Database,
        DatabaseService
    ]
})
export class DatabaseModule {}