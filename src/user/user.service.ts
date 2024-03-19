import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Provider, Role, User } from '@prisma/client';
import { Cache } from 'cache-manager';
import { FileService } from 'src/file/file.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/user.dto';
import { convertToSeconds } from 'common/utils';
import { JwtPayload } from 'src/auth/interfaces';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly config: ConfigService,
    private readonly fileService: FileService
  ) { }

  async findOne(identifier: string, isRefresh = false) {
    if (!isRefresh) {
      const user: User = await this.cacheManager.get(identifier);
      if (user) {
        return user;
      }
    }
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: identifier },
          { email: identifier },
          { nickname: identifier }
        ]
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.updateUserInCache(user);
    return user;
  }

  async create(user: Partial<User>, provider: Provider = 'LOCAL') {
    const existingUser = await this.prisma.user.findUnique({ where: { email: user.email } });
    if (existingUser) throw new ConflictException('Email already exists');

    const hashedPassword = user.password ? await bcrypt.hash(user.password, 10) : null;

    return await this.prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        surname: user.surname,
        avatar: user.avatar,
        nickname: user.nickname,
        roles: ['USER'],
        provider: provider,
        password: hashedPassword,
      }
    });
  }

  async delete(id: string, user: JwtPayload) {
    if (user.id !== id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('You are not allowed to delete this user')
    }

    const deletedUser = await this.findOne(id, true);
    if (!deletedUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction(async prisma => [
      await prisma.user.delete({ where: { id } }),
      await this.fileService.deleteImage(deletedUser.avatar),
      await this.cacheManager.store.mdel(`user:${id}`, `user:${deletedUser.email}`, `user:${deletedUser.nickname}`)
    ]);

    return deletedUser.id
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id)
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction(async prisma => [
      await prisma.user.update({
        where: { id },
        data: { ...dto }
      }),
      await this.updateUserInCache({ ...user, ...dto })
    ]);

    return 'User updated successfully'
  }

  async updateImage(id: string, imagePath: string) {
    const user = await this.findOne(id)
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.$transaction(async prisma => [
      await prisma.user.update({
        where: { id },
        data: {
          avatar: imagePath
        }
      }),
      await this.fileService.deleteImage(user.avatar),
      await this.updateUserInCache({ ...user, avatar: imagePath })
    ]);
    return 'Image updated successfully'
  }

  async updateUserInCache(user: User) {
    await this.cacheManager.store.mset([
      [`user:${user.id}`, user],
      [`user:${user.email}`, user],
      [`user:${user.nickname}`, user]
    ], convertToSeconds(this.config.get('JWT_EXP')))
  }
}
