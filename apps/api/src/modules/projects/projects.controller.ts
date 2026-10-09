import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput, readJson } from '../../lib/validation';
import * as feedsService from './projects.feeds.service';
import {
  createProjectSchema,
  eligibleMembersQuerySchema,
  listProjectsQuerySchema,
  projectFeedQuerySchema,
  projectMembersSchema,
  updateProjectSchema,
  uuidSchema,
} from './projects.schema';
import * as projectsService from './projects.service';

const projectId = (c: Context<AppEnv>) => parseInput(uuidSchema, c.req.param('id'));

export async function list(c: Context<AppEnv>) {
  const query = parseInput(listProjectsQuerySchema, c.req.query());
  return c.json(await projectsService.listProjects(requestScope(c), query));
}

export async function detail(c: Context<AppEnv>) {
  return c.json({ data: await projectsService.getProject(requestScope(c), projectId(c)) });
}

export async function create(c: Context<AppEnv>) {
  const input = parseInput(createProjectSchema, await readJson(c));
  return c.json({ data: await projectsService.createProject(requestScope(c), input) }, 201);
}

export async function update(c: Context<AppEnv>) {
  const input = parseInput(updateProjectSchema, await readJson(c));
  const project = await projectsService.updateProject(requestScope(c), projectId(c), input);
  return c.json({ data: project });
}

export async function archive(c: Context<AppEnv>) {
  await projectsService.archiveProject(requestScope(c), projectId(c));
  return c.body(null, 204);
}

export async function restore(c: Context<AppEnv>) {
  return c.json({ data: await projectsService.restoreProject(requestScope(c), projectId(c)) });
}

export async function members(c: Context<AppEnv>) {
  const { employeeIds } = parseInput(projectMembersSchema, await readJson(c));
  const project = await projectsService.setProjectMembers(
    requestScope(c),
    projectId(c),
    employeeIds,
  );
  return c.json({ data: project });
}

export async function eligibleForDepartment(c: Context<AppEnv>) {
  const { departmentId } = parseInput(eligibleMembersQuerySchema, c.req.query());
  const people = await projectsService.listEligibleForDepartment(requestScope(c), departmentId);
  return c.json({ data: people });
}

export async function eligibleForProject(c: Context<AppEnv>) {
  const people = await projectsService.listEligibleForProject(requestScope(c), projectId(c));
  return c.json({ data: people });
}

export async function tasks(c: Context<AppEnv>) {
  const query = parseInput(projectFeedQuerySchema, c.req.query());
  return c.json(await feedsService.listProjectTasks(requestScope(c), projectId(c), query));
}

export async function activities(c: Context<AppEnv>) {
  const query = parseInput(projectFeedQuerySchema, c.req.query());
  return c.json(await feedsService.listProjectActivities(requestScope(c), projectId(c), query));
}
