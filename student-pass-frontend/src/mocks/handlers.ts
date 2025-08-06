import { http, HttpResponse } from 'msw';
import { mockUser, mockAdminUser, mockApplication, mockPass, mockAccessLog } from '../utils/test-utils';

export const handlers = [
  // Auth endpoints
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    if (body.email === 'admin@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: mockAdminUser,
        token: 'mock-admin-token',
      });
    }
    
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: mockUser,
        token: 'mock-token',
      });
    }
    
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      user: { ...mockUser, ...body, id: Date.now().toString() },
      token: 'mock-token',
    });
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json(mockUser);
  }),

  // Application endpoints
  http.get('/api/v1/applications', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const userId = url.searchParams.get('userId');
    
    let applications = [mockApplication];
    
    if (status) {
      applications = applications.filter(app => app.status === status);
    }
    
    if (userId) {
      applications = applications.filter(app => app.studentId === userId);
    }
    
    return HttpResponse.json(applications);
  }),

  http.get('/api/v1/applications/:id', ({ params }) => {
    return HttpResponse.json({ ...mockApplication, id: params.id });
  }),

  http.post('/api/v1/applications', async ({ request }) => {
    const formData = await request.formData();
    const newApplication = {
      ...mockApplication,
      id: Date.now().toString(),
      passType: formData.get('passType'),
      purpose: formData.get('purpose'),
      validFrom: formData.get('validFrom'),
      validTo: formData.get('validTo'),
    };
    return HttpResponse.json(newApplication);
  }),

  http.patch('/api/v1/applications/:id', async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      ...mockApplication,
      id: params.id,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.patch('/api/v1/applications/:id/review', async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      ...mockApplication,
      id: params.id,
      status: body.status,
      reviewComments: body.comments,
      reviewedAt: new Date().toISOString(),
      reviewedBy: mockAdminUser.id,
    });
  }),

  // Pass endpoints
  http.get('/api/v1/passes', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const active = url.searchParams.get('active');
    
    let passes = [mockPass];
    
    if (userId) {
      passes = passes.filter(pass => pass.studentId === userId);
    }
    
    if (active === 'true') {
      passes = passes.filter(pass => pass.isActive);
    }
    
    return HttpResponse.json(passes);
  }),

  http.get('/api/v1/passes/:id', ({ params }) => {
    return HttpResponse.json({ ...mockPass, id: params.id });
  }),

  http.post('/api/v1/passes/generate', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      ...mockPass,
      id: Date.now().toString(),
      applicationId: body.applicationId,
    });
  }),

  http.patch('/api/v1/passes/:id/deactivate', ({ params }) => {
    return HttpResponse.json({
      ...mockPass,
      id: params.id,
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
  }),

  // Access endpoints
  http.post('/api/v1/access/verify', async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.qrCode === 'valid-qr-code') {
      return HttpResponse.json({
        valid: true,
        message: 'Access granted',
        passData: mockPass,
      });
    }
    
    return HttpResponse.json({
      valid: false,
      message: 'Invalid pass',
    });
  }),

  http.get('/api/v1/access/logs', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const passId = url.searchParams.get('passId');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    let logs = [mockAccessLog];
    
    if (userId) {
      logs = logs.filter(log => log.studentId === userId);
    }
    
    if (passId) {
      logs = logs.filter(log => log.passId === passId);
    }
    
    return HttpResponse.json(logs.slice(0, limit));
  }),

  // Upload endpoints
  http.post('/api/v1/upload', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    return HttpResponse.json({
      url: `https://example.com/uploads/${file.name}`,
      filename: file.name,
    });
  }),
];

export default handlers;