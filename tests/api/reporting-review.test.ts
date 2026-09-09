import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ grantCount: vi.fn(), memberCount: vi.fn(), locations: vi.fn() }));
vi.mock('../../prisma/prisma-client', () => ({ default: {
  grant: { count: mocks.grantCount }, member: { count: mocks.memberCount, groupBy: mocks.locations },
} }));
import { grantsObtainedCount, grantsSubmittedCount, grantsCompletedCount } from '../../src/reporting/metrics/grants';
import { membersByLocation, membersTotal } from '../../src/reporting/metrics/members';

beforeEach(() => vi.resetAllMocks());
describe('reporting review regressions', () => {
  it.each([grantsObtainedCount, grantsSubmittedCount, grantsCompletedCount])('%s preserves obtained year and source filters', async metric => {
    const dates = [new Date('2022-06-01'), new Date('2023-06-01')];
    mocks.grantCount.mockImplementation(({ where }) => {
      // Evaluate the date predicates over two grants, including the pre-fix flat shape.
      const clauses = where.AND ?? [where];
      return dates.filter(date => clauses.every((c: any) => {
        const range = c.obtained_date;
        return !range || ((!range.gte || date >= range.gte) && (!range.lte || date <= range.lte));
      })).length;
    });
    const result = await metric.run({ instituteId: 1, lang: 'en', filters: {
      yearFrom: 2022, yearTo: 2022, selections: [{ dimension: 'grant.source', key: 3, label: 'Source' }],
    } });
    expect(result.value).toBe(1);
    const where = mocks.grantCount.mock.calls[0][0].where;
    expect(where.AND ?? [where]).toContainEqual(expect.objectContaining({ instituteId: 1, source_id: 3 }));
  });

  it.each([
    [null, 'Canada'], ['Ottawa', null], ['Ottawa', 'Canada'],
    ['City, District', 'Country, Region'], [null, null], ['', 'Canada'],
  ])('round-trips location (%s, %s) without losing its fields', async (city, country) => {
    mocks.locations.mockResolvedValue([{ city, country, _count: { _all: 2 } }]);
    const rows = await membersByLocation.run({ instituteId: 1, lang: 'en', filters: {} });
    await membersTotal.run({ instituteId: 1, lang: 'fr', filters: {
      selections: [{ dimension: 'member.location', key: rows[0].key!, label: rows[0].label }],
    } });
    expect(mocks.memberCount).toHaveBeenCalledWith({ where: {
      institutes: { some: { instituteId: 1 } }, city, country,
    } });
  });
  it('keeps distinct locations with the same display label separately selectable', async () => {
    mocks.locations.mockResolvedValue([
      { city: null, country: 'Canada', _count: { _all: 2 } },
      { city: 'Canada', country: null, _count: { _all: 3 } },
    ]);
    const rows = await membersByLocation.run({ instituteId: 1, lang: 'en', filters: {} });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map(r => r.key)).size).toBe(2);
  });
});
