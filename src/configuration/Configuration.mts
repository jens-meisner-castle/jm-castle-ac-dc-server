import fs from "fs";

const getVariable = (name: string) => {
  let value = process.env[name];
  if (!value) {
    const idx = process.argv.indexOf(name);
    if (idx > 0) {
      value = process.argv[idx + 1];
    }
  }
  return value;
};
export const configFilePath = () => {
  const nodeEnv = getVariable("NODE_ENV");
  const configFile = getVariable("CONFIG");
  if (nodeEnv !== "development" && !configFile) {
    throw new Error("Environment variable or argument CONFIG is missing!");
  }
  return configFile || "public/config/castle-ac-dc-config.json";
};

export function readJsonFile<T>(path: string): T {
  const configuration: T = JSON.parse(fs.readFileSync(path).toString("utf8"));
  return configuration;
}

export const replacePasswordInObject = (
  obj: Record<string, unknown>,
  useValue = "xxx"
) => {
  Object.keys(obj).forEach((k) => {
    const element = obj[k];
    if (k === "password") {
      obj[k] = useValue;
    } else {
      if (Array.isArray(element)) {
        replacePasswordInArray(element, useValue);
      } else if (typeof element === "object") {
        replacePasswordInObject(element as Record<string, unknown>, useValue);
      }
    }
  });
};

const replacePasswordInArray = (obj: unknown[], useValue: string) => {
  obj.forEach((element) => {
    if (Array.isArray(element)) {
      replacePasswordInArray(element, useValue);
    } else if (typeof element === "object") {
      replacePasswordInObject(element as Record<string, unknown>, useValue);
    }
  });
};
