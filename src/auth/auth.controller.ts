import { Controller, Ip, Post, Req } from '@nestjs/common';
import { Public } from 'common/decorators';
import DeviceDetector from 'device-detector-js';
import { Request } from 'express';
import { Fingerprint, IFingerprint, RealIp } from 'nestjs-fingerprint';
import { RealIP } from 'nestjs-real-ip';

@Public()
@Controller('auth')
export class AuthController {
  @Post('me')
  getMe(
    @RealIp() ip: string,
    @Ip() ip2: string,
    @Fingerprint() fp: IFingerprint,
    @RealIP() ip3: string,
    @Req() req: Request
  ) {
    const deviceDetector = new DeviceDetector();
    const userAgent = req.headers['user-agent'];
    const device = deviceDetector.parse(userAgent);
    return {
      device
    }
  }
}
