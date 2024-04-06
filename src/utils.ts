import { UserEntity, UserPayload } from "./types";
import fetch from "node-fetch";

export function checkEnvs(): void {
    try {
        // Status
        if (process.env.VERSION === undefined) {
            throw new Error(`Environment variable VERSION is not found.`);
        }
        if (process.env.PORT === undefined) {
            throw new Error(`Environment variable PORT is not found.`);
        }
        if (process.env.NODE_ENV === undefined) {
            throw new Error(`Environment variable NODE_ENV is not found.`);
        }
        // Redis
        if (process.env.REDIS_URL === undefined) {
            throw new Error(`Environment variable REDIS_URL is not found.`);
        }
        if (process.env.REDIS_KEY_PREFIX === undefined) {
            throw new Error(`Environment variable REDIS_KEY_PREFIX is not found.`);
        }
        // Google Auth
        if (process.env.CLIENT_ID === undefined) {
            throw new Error(`Environment variable CLIENT_ID is not found.`);
        }
        // Session
        if (process.env.SESSION_MAX_AGE_IN_HOURS === undefined) {
            throw new Error(`Environment variable SESSION_MAX_AGE_IN_HOURS is not found.`);
        }
        if (process.env.SESSION_SECRET === undefined) {
            throw new Error(`Environment variable SESSION_SECRET is not found.`);
        }
        if (process.env.JWT_SECRET_KEY === undefined) {
            throw new Error(`Environment variable JWT_SECRET_KEY is not found.`);
        }
        if (process.env.COOKIE_NAME === undefined) {
            throw new Error(`Environment variable COOKIE_NAME is not found.`);
        }
        // External APIs
        if (process.env.SERVER_URL === undefined) {
            throw new Error(`Environment variable SERVER_URL is not found.`);
        }
        if (process.env.PAYMENT_SERVER_URL === undefined) {
            throw new Error(`Environment variable PAYMENT_SERVER_URL is not found.`);
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

/**
 * Create user if not present, or return existed user
 * 
 * @param userPayload
 * @returns
 */
export async function createUser(userPayload: UserPayload): Promise<UserEntity | null> {
    const user = await fetch(`${process.env.SERVER_URL}/user`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(userPayload),
    }).then(res => {
        if (res.ok) {
            return res.json() as unknown as UserEntity
        }
        return null;
    }).catch(err => {
        console.error(err)
        return null;
    })

    return user;
}