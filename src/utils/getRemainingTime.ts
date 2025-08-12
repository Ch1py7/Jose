import { HOUR, MINUTE, SECOND } from './constants'

export const getRemainingTime = (removingAt: number) => {
	const now = Date.now()
	const remaining = removingAt - now

	if (remaining <= 0) return '00:00:00'

	const hours = Math.floor(remaining / HOUR)
	const minutes = Math.floor((remaining % HOUR) / MINUTE)
	const seconds = Math.floor((remaining % MINUTE) / SECOND)

	const pad = (n: number) => n.toString().padStart(2, '0')

	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
