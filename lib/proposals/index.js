export const PROPOSALS = {
}

export function getProposal(slug) {
  return PROPOSALS[slug] ?? null
}
