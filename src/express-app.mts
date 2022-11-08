import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import createError from "http-errors";

import { router as apiRouter } from "./routes/api.mjs";

export const newExpressApp = (port: number | string | false) => {
  const app = express();

  app.set("port", port);
  app.use(cors());

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static("./web-app"));

  app.use("/api", apiRouter);

  app.get("*", (req, res, next) => {
    res.render("index.html");
  });

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    next(createError(404));
  });

  // error handler
  app.use(function (err: any, req: any, res: any, next: any) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
  });
  return app;
};
