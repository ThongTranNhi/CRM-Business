import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { changePassword, login, me, register } from './auth.controller';

export const publicAuthRoutes = new Hono<AppEnv>();
publicAuthRoutes.post('/register', register);
publicAuthRoutes.post('/login', login);
export const privateAuthRoutes = new Hono<AppEnv>();
privateAuthRoutes.get('/me', me);
privateAuthRoutes.post('/change-password', changePassword);
