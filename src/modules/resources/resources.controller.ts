import { Request, Response, NextFunction } from 'express';
import * as resourceService from './resources.service';

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const resources = await resourceService.getAllResources();
    res.json(resources);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const resource = await resourceService.getResourceById(req.params.id);
    res.json(resource);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const resource = await resourceService.createResource(req.body);
    res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const resource = await resourceService.updateResource(req.params.id, req.body);
    res.json(resource);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await resourceService.deleteResource(req.params.id);
    res.json({ message: 'Resource removed' });
  } catch (error) {
    next(error);
  }
}
