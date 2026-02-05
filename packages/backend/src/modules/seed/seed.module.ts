import { Module } from '@nestjs/common';
import { DataInitializerService } from './data-initializer.service';

@Module({
  providers: [DataInitializerService],
  exports: [DataInitializerService],
})
export class SeedModule {}
