import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockUpdateSession = vi.fn().mockResolvedValue(NextResponse.next());

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: (request: NextRequest) => mockUpdateSession(request),
}));

import { middleware, config } from '@/middleware';

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls updateSession with the request', async () => {
    const url = 'http://localhost/dashboard';
    const request = new NextRequest(url);
    await middleware(request);
    expect(mockUpdateSession).toHaveBeenCalledTimes(1);
    expect(mockUpdateSession).toHaveBeenCalledWith(request);
  });

  it('returns the result of updateSession', async () => {
    const response = NextResponse.next();
    mockUpdateSession.mockResolvedValueOnce(response);
    const request = new NextRequest('http://localhost/api/credits');
    const result = await middleware(request);
    expect(result).toBe(response);
  });

  it('exports correct config matcher', () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher).toHaveLength(1);
    expect(config.matcher[0]).toContain('_next/static');
    expect(config.matcher[0]).toContain('_next/image');
    expect(config.matcher[0]).toContain('favicon.ico');
    expect(config.matcher[0]).toContain('svg');
  });

  it('matcher pattern correctly matches and excludes expected paths', () => {
    const pattern = config.matcher[0];
    // Pattern must exclude static assets, images, and favicon
    expect(pattern).toContain('_next/static');
    expect(pattern).toContain('_next/image');
    expect(pattern).toContain('favicon.ico');
    expect(pattern).toContain('svg');
    expect(pattern).toContain('png');
    expect(pattern).toContain('jpg');
    expect(pattern).toContain('jpeg');
    expect(pattern).toContain('gif');
    expect(pattern).toContain('webp');
  });
});
