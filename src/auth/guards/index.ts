import { JwtAuthGuard } from "./jwt.guard";
import { RolesGuard } from "./role.guard";

export * from './jwt.guard'
export * from './role.guard'

export const GUARDS = [JwtAuthGuard, RolesGuard]