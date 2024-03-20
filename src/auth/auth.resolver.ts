import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UserType } from 'src/user/type/user.type';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Cookie, Public, UserIp, UserAgent } from 'common/decorators';
import { UnauthorizedException } from '@nestjs/common';

@Public()
@Resolver()
export class AuthResolver {
  constructor(
    private authService: AuthService,
  ) { }

  @Mutation(() => String)
  async register(
    @Args('registerInput') dto: RegisterDto,
  ) {
    await this.authService.register(dto)
    return 'Registration successful';
  }

  @Mutation(() => UserType)
  async login(
    @Args('loginInput') dto: LoginDto,
    @Context() context: { res: Response, req: Request },
    @UserIp('ip') ip: string,
    @UserAgent('user-agent') userAgent: string,
  ) {
    const user = await this.authService.login(dto)
    const tokens = await this.authService.generateTokens(user, { ip, userAgent });

    await this.authService.setRefreshTokenToCookie(tokens.refreshToken, context.res)
    return {
      ...user,
      token: tokens.accessToken
    }
  }

  @Mutation(() => String)
  async logout(
    @Cookie('refreshToken') refreshToken: string,
    @Context() context: { res: Response },
  ) {
    if (refreshToken) {
      await this.authService.deleteRefreshToken(refreshToken)
      context.res.clearCookie('refreshToken')
    }
    return 'Logout successful';
  }

  @Mutation(() => String)
  async refreshTokens(
    @Cookie('refreshToken') refreshToken: string,
    @Context() context: { res: Response },
    @UserIp('ip') ip: string,
    @UserAgent('user-agent') userAgent: string,
  ) {
    if (!refreshToken) throw new UnauthorizedException()
    const tokens = await this.authService.refreshTokens(refreshToken, { ip, userAgent })

    await this.authService.setRefreshTokenToCookie(tokens.refreshToken, context.res)
    return tokens.accessToken;
  }
}
