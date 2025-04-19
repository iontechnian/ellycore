import { Module } from "@nestjs/common";
import { SourceModule } from "./source/source.module.ts";
import { FragmentModule } from "./fragment/fragment.module.ts";
@Module({
    imports: [
        SourceModule,
        FragmentModule,
    ],
})
export class AppModule {}