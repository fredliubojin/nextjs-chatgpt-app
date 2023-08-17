import type { NextRouter } from 'next/router';

export interface AppCallQueryParams {
  conversationId: string;
  personaId: string;
  llmId: string;
}

export function launchAppCall(router: NextRouter, queryParams: AppCallQueryParams) {
  router.push(
    {
      pathname: `/call`,
      query: { ...queryParams },
    },
    // '/call',
  ).then();
}