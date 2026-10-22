// Published plan references, not measured remaining balances. Recheck after plan/pricing changes.
export const budgetVerifiedAt = '22 October 2026';
export const freeTierBudgets = [
  {
    provider: 'Neon Free',
    source: 'https://neon.com/pricing',
    rows: [
      ['Database storage', '1 GB / project', 'Stored capacity; not a monthly refill'],
      ['Object/image storage', '5 GB / project', 'Stored capacity; separate from database storage'],
      [
        'Public network transfer',
        '5 GB / project',
        'Monthly; database and object-storage egress share this allowance',
      ],
      ['Database compute', '100 CU-hours / project', 'Monthly; all project branches contribute'],
      ['Branches', '10 / project', 'Concurrent capacity'],
    ],
  },
  {
    provider: 'Vercel Hobby',
    source: 'https://vercel.com/docs/plans/hobby',
    rows: [
      ['Fast Data Transfer', '100 GB', 'Hobby usage window; not a fixed calendar billing month'],
      ['Fast Origin Transfer', '10 GB', 'Hobby usage window'],
      ['CDN requests', '1,000,000', 'Hobby usage window'],
      ['Function invocations', '1,000,000', 'Hobby usage window'],
      ['Active CPU', '4 CPU-hours', 'Hobby usage window'],
      ['Provisioned memory', '360 GB-hours', 'Hobby usage window'],
      ['Image transformations', '5,000', 'Platform image-optimization allowance'],
    ],
  },
  {
    provider: 'Vercel Blob — comparison only',
    source: 'https://vercel.com/docs/vercel-blob/usage-and-pricing',
    rows: [
      ['Blob storage', '1 GB-month', 'Average stored size over the month'],
      ['Blob data transfer', '10 GB', 'Separate from website Fast Data Transfer'],
      ['Simple operations', '10,000', 'Included usage; cache misses and metadata reads'],
      ['Advanced operations', '2,000', 'Included usage; uploads, copies and listings'],
    ],
  },
] as const;
