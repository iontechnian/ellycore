import { Module } from "@nestjs/common";
import { SourceService } from "./source.service.ts";

@Module({
    providers: [
        SourceService,
    ],
    exports: [
        SourceService,
    ],
})
export class SourceModule {}