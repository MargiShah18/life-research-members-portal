import type { NextApiRequest, NextApiResponse } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ actor: vi.fn(), institutes: vi.fn(), update: vi.fn(), audit: vi.fn() }));
vi.mock('../../prisma/prisma-client', () => ({default: {
  memberInstitute: {findMany: mocks.institutes}, member: {update: mocks.update}, auditEvent: {create: mocks.audit},
}}));
vi.mock('../../src/utils/api/get-account-from-request', () => ({default: mocks.actor}));
import publicHandler from '../../src/pages/api/update-member/[id]/public';
import privateHandler from '../../src/pages/api/update-member/[id]/private';
import insightHandler from '../../src/pages/api/update-member/[id]/insight';
const routes = [
  {name: 'public', handler: publicHandler, body: {about_me_en: 'Updated profile', about_me_fr: ''}},
  {name: 'private', handler: privateHandler, body: {city: 'Ottawa'}},
  {name: 'insight', handler: insightHandler, body: {admin_notes: 'Updated note'}},
];
function response() {
  const res = {statusCode: 200, status: vi.fn(), send: vi.fn(), setHeader: vi.fn()};
  res.status.mockImplementation(code => {res.statusCode = code; return res;});
  res.send.mockReturnValue(res);
  return res;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.actor.mockResolvedValue({id: 10, is_super_admin: false, instituteAdmin: [{instituteId: 1}], member: null});
  mocks.institutes.mockResolvedValue([{instituteId: 1}]);
  mocks.update.mockResolvedValue({id: 20});
});
describe.each(routes)('$name member edit', ({handler, body}) => {
  it('allows an institute admin to save a member in their institute', async () => {
    const res = response();
    await handler({method: 'PATCH', headers: {}, query: {id: '20'}, body} as unknown as NextApiRequest, res as unknown as NextApiResponse);
    expect(res.statusCode).toBe(200);
    expect(res.send).toHaveBeenCalledWith({id: 20});
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({where: {id: 20}}));
    expect(mocks.audit).toHaveBeenCalled();
  });
  it('rejects an unrelated institute admin without saving', async () => {
    mocks.institutes.mockResolvedValue([{instituteId: 2}]);
    const res = response();
    await handler({method: 'PATCH', headers: {}, query: {id: '20'}, body} as unknown as NextApiRequest, res as unknown as NextApiResponse);
    expect(res.statusCode).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
