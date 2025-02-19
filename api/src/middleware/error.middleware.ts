import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction
): void => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
};

export const notFoundHandler = (
  req: Request,
  res: Response<ErrorResponse>
): void => {
  res.status(404).json({ error: 'Route not found' });
}; 