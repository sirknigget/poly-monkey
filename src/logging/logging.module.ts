import { Logger, Module, Scope } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: Logger,
      scope: Scope.TRANSIENT,
      inject: [INQUIRER],
      useFactory: (parentClass: object) =>
        new Logger(parentClass.constructor.name),
    },
  ],
  exports: [Logger],
})
export class LoggingModule {}
