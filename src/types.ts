// User payload in /login request body
export interface UserPayload {
    username: string
    email: string
    avatar_uri: string
}

// User entity from DB API
export interface UserEntity {
    id: string
    username: string
    email: string
    avatar_uri: string
}

export interface JwtPayload {
    userId: string
    username: string
    email: string
    avatar_uri: string
}

declare module 'express-session' {
    interface SessionData {
        jwtToken: string
    }
}