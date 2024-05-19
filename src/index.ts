import express, { Express, NextFunction, Response, Request } from "express";
import cors from "cors";
import session from "express-session";
import * as redis from "redis";
import RedisStore from "connect-redis"
import { checkEnvs, createUser } from "./utils";
import jwtHandler from "./jwtHandler";
import { JwtPayload, UserEntity, UserPayload } from "./types";
import { createProxyMiddleware } from "http-proxy-middleware";
import morgan from 'morgan';
import fs from "fs";
import path from "path";

require('dotenv').config();

// Check if environment variables are correctly setup
checkEnvs();

const app: Express = express();

const cors_origins = [
  'http://localhost:3000'
]
if (process.env.PRODUCTION_CORS_ENDPOINT) {
  cors_origins.push(process.env.PRODUCTION_CORS_ENDPOINT)
}
app.use(cors({ credentials: true, origin: cors_origins }));

fs.mkdir(`${__dirname}/log`, { recursive: true }, (err) => {
  if (err) throw err;
});
const accessLogStream = fs.createWriteStream(path.join(__dirname, "log", 'auther.log'), { flags: 'a' });
app.use(morgan('common', { stream: accessLogStream }));

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
}

app.use(errorHandler);

const cookieName = process.env.COOKIE_NAME!;
const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});
redisClient.connect().catch(console.error)

app.use(
  session({
    name: cookieName,
    store: new RedisStore({ client: redisClient, prefix: process.env.REDIS_KEY_PREFIX }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV! === "production", // if true only transmit cookie over https
      httpOnly: process.env.NODE_ENV! === "production", // if true prevent client side JS from reading the cookie 
      maxAge: 1000 * 60 * 60 * Number(process.env.SESSION_MAX_AGE_IN_HOURS),
    }
  })
);

// Proxy to server
app.use('/modelServer', createProxyMiddleware({
  target: process.env.SERVER_URL,
  changeOrigin: true,
  pathRewrite: {
    [`^/modelServer`]: '',
  },
  onProxyReq: (proxyReq, req) => {
    console.log(req.session.jwtToken)
    // Add JWT token to the Authorization header as a Bearer token
    const jwtToken = req.session.jwtToken;
    if (jwtToken) {
      proxyReq.setHeader('Authorization', `Bearer ${jwtToken}`);
    }
  }
}));

// Proxy to payment server
app.use('/paymentServer', createProxyMiddleware({
  target: process.env.PAYMENT_SERVER_URL,
  changeOrigin: true,
  pathRewrite: {
    [`^/paymentServer`]: '',
  },
  onProxyReq: (proxyReq, req) => {
    // * Allow newebpay's notifiy POST api
    if (req.url !== "newebpay_return" && req.url !== "newebpay_notify") {
      // Add JWT token to the Authorization header as a Bearer token
      const jwtToken = req.session.jwtToken;
      if (jwtToken) {
        proxyReq.setHeader('Authorization', `Bearer ${jwtToken}`);
      }
    }
  }
}));

app.use(express.json());

app.get("/", (req, res, next) => {
  try {
    res.status(200).json({
      app: "Auth Service",
      version: process.env.VERSION
    })
  } catch (err) {
    next(err)
  }
})

app.get("/health", (req, res, next) => {
  try {
    res.status(200).json({
      message: "Auth service is alive"
    })
  } catch (err) {
    next(err);
  }
})

// Authenticate user
app.get("/auth", (req, res, next) => {
  try {
    const token = req.session.jwtToken;
    console.log(req.session)
    if (token) {
      try {
        const userPayload = jwtHandler.verify(token);
        return res.json(userPayload);
      } catch (err) {
        return res.status(401).json({
          message: "Unauthorized"
        })
      }
    } else {
      return res.status(401).json({
        message: "Unauthorized"
      })
    }
  } catch (err) {
    next(err)
  }
})

app.post("/login", async (req, res, next) => {
  try {
    const userPayload: UserPayload = req.body;
    const user: UserEntity | null = await createUser(userPayload);
    if (!user) {
      return res.status(400).json({
        message: "Login failed"
      })
    }
    const jwtPayload: JwtPayload = {
      userId: user.id,
      username: userPayload.username,
      email: userPayload.email,
      avatar_uri: userPayload.avatar_uri
    }
    const jwtToken = jwtHandler.sign(jwtPayload)
    req.session.jwtToken = jwtToken;

    return res.status(200).json({ message: "Login OK" })

  } catch (err) {
    next(err);
  }
})

app.get("/logout", (req, res, next) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        throw new Error(`Error destroying session: ${err}`)
      }
      res.clearCookie(cookieName);
      return res.status(200).json({
        message: "Logout successfully"
      })
    });
  } catch (err) {
    next(err);
  }
})

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server is running at ${PORT}`));