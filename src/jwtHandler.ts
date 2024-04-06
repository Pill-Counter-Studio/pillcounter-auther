import jwt from "jsonwebtoken";
import { JwtPayload } from "./types";

require('dotenv').config();

class JwtHandler {
    private JWT_SECRET_KEY;

    constructor(secret: string) {
        this.JWT_SECRET_KEY = secret;
    }

    public sign(payload: JwtPayload) {
        return jwt.sign(payload, this.JWT_SECRET_KEY);
    }

    public verify(token: string) {
        return jwt.verify(token, this.JWT_SECRET_KEY);
    }
}

const jwtHandler = new JwtHandler(process.env.JWT_SECRET_KEY!);

export default jwtHandler;