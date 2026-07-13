export const PROPOSALS = {
  'topk9-x7k2': {
    client: 'TopK9 Selection',
    date: 'Julio 2026',
    contact: { email: 'rafa@bonsight.co', whatsapp: '13123509796' },
  },
}

export function getProposal(slug) {
  return PROPOSALS[slug] ?? null
}
