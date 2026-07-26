import { describe, expect, it } from 'vitest';
import { AppError, created, fail, fromError, ok } from '../../../src/server/lib/http';

describe('AppError', () => {
  it('constructs with code, message, status', () => {
    const err = new AppError('NOT_FOUND', 'Item not found', 404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Item not found');
    expect(err.status).toBe(404);
    expect(err.name).toBe('AppError');
  });

  it('defaults status to 400', () => {
    const err = new AppError('INVALID_INPUT', 'bad input');
    expect(err.status).toBe(400);
  });

  it('stores details', () => {
    const err = new AppError('INTERNAL', 'oops', 500, { field: 'x' });
    expect(err.details).toEqual({ field: 'x' });
  });
});

describe('ok', () => {
  it('returns 200 with ok:true envelope', async () => {
    const res = ok({ id: '1' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ id: '1' });
  });

  it('accepts custom status init', async () => {
    const res = ok({ id: '2' }, { status: 202 });
    expect(res.status).toBe(202);
  });
});

describe('created', () => {
  it('returns 201 with ok:true envelope', async () => {
    const res = created({ id: '3' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ id: '3' });
  });
});

describe('fail', () => {
  it('returns error envelope with given status', async () => {
    const res = fail('NOT_FOUND', 'not found', 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('not found');
  });

  it('defaults status to 400', async () => {
    const res = fail('INVALID_INPUT', 'bad');
    expect(res.status).toBe(400);
  });
});

describe('fromError', () => {
  it('handles AppError', async () => {
    const err = new AppError('NOT_FOUND', 'missing', 404);
    const res = fromError(err);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('handles ZodError-like object', async () => {
    const zodErr = {
      name: 'ZodError',
      issues: [{ path: ['field'], message: 'Required' }],
    };
    const res = fromError(zodErr);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('handles ZodError with INVALID_PUBLIC_KEY message', async () => {
    const zodErr = {
      name: 'ZodError',
      issues: [{ path: ['address'], message: 'INVALID_PUBLIC_KEY' }],
    };
    const res = fromError(zodErr);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_PUBLIC_KEY');
  });

  it('handles unknown errors as 500', async () => {
    const res = fromError(new Error('surprise'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INTERNAL');
  });
});
