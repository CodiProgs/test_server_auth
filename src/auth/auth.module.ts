import { Module } from '@nestjs/common';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { GUARDS } from './guards';
import { JwtStrategy } from './strategies/jwt.strategy';
import { FileModule } from 'src/file/file.module';
import { options } from './config/jwt-module-async-option';

@Module({
  providers: [AuthService, AuthResolver, ...GUARDS, JwtStrategy],
  imports: [UserModule, JwtModule.registerAsync(options()), FileModule],
})
export class AuthModule { }
