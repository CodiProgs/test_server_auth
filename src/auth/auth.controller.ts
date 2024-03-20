import { Controller, Ip, Post } from '@nestjs/common';
import { Public } from 'common/decorators';
import { Fingerprint, IFingerprint, RealIp } from 'nestjs-fingerprint';

@Public()
@Controller('auth')
export class AuthController {
  @Post('me')
  getMe(
    @RealIp() ip: string,
    @Ip() ip2: string,
    @Fingerprint() fp: IFingerprint
  ): IFingerprint {
    return fp;
  }
}
