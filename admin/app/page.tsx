import { redirect } from 'next/navigation'

/**
 * Root page — redirect to the default Arabic locale.
 */
export default function Root() {
  redirect('/ar')
}
