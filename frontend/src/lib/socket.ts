import { io, Socket } from 'socket.io-client'
import { BACKEND_URL } from './constants'

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      path: '/socket',
      transports: ['websocket'],
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(nullifierHash: string): Socket {
  const s = getSocket()
  if (!s.connected) {
    s.auth = { nullifier_hash: nullifierHash }
    s.connect()
  }
  return s
}

export function disconnectSocket(): void {
  if (socket && socket.connected) {
    socket.disconnect()
  }
}

export { getSocket }
export default getSocket
