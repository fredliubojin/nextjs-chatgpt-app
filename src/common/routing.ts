import Router from 'next/router';

export interface AppCallQueryParams {
  conversationId: string;
  personaId: string;
}

export function launchAppCall(conversationId: string, personaId: string) {
  Router.push(
    {
      pathname: `/call`,
      query: {
        conversationId,
        personaId,
      } satisfies AppCallQueryParams,
    },
    // '/call',
  ).then();
}