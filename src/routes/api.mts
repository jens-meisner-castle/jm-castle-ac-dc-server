import express from "express";
import { services } from "../api/_services.mjs";

export const router = express.Router();

services.forEach((service) => {
  const { method, url, handler } = service;
  switch (method) {
    case "GET":
    default:
      router.get(service.url, service.handler);
  }
});
