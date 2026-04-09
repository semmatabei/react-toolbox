import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/patterns/$slug', params: { slug: 'form--basic' } })
  },
})
