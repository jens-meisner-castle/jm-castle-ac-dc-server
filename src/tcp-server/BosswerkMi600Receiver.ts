import { createServer, Server } from "net";

export const closeServer = (server: Server) => {
  server.close((error) =>
    error
      ? console.error(`When closing server (${server.address}): `, error)
      : console.log(`Server closed. ${server.address()}`)
  );
};

const compare = (current: number[], previous: number[]) => {
  const compareArr: string[] = [];
  current.forEach(
    (c, i) =>
      c !== previous[i] && compareArr.push(`${previous[i]} => ${c} (${i})`)
  );
  return compareArr;
};

const previousThree: [
  number[] | undefined,
  number[] | undefined,
  number[] | undefined
] = [undefined, undefined, undefined];
let i: 0 | 1 | 2 = 0;

export const startServer = (ip: string, port: number) => {
  const server = createServer((socket) => {
    socket.on("end", () => console.log("client disconnected"));
    socket.on("data", (data) => {
      const length = data.byteLength;
      const numbers: number[] = [];
      data.forEach((n) => numbers.push(n));
      const previous = previousThree[i];
      const compareArr = previous && compare(numbers, previous);
      previousThree[i] = numbers;
      console.log({
        at: new Date().toString(),
        i,
        length: data.byteLength,
        content: JSON.stringify(numbers),
        compare: compareArr ? JSON.stringify(compareArr) : undefined,
      });
      i = (i === 2 ? 0 : i + 1) as any;
    });
  });
  server.on("close", () => console.log("server is closing"));
  server.listen(port, ip, () => console.log("tcp server started: ", ip, port));

  process.on("SIGTERM", () => {
    console.log("SIGTERM");
    closeServer(server);
  });
  process.on("SIGINT", () => {
    console.log("SIGINT");
    closeServer(server);
  });
  process.on("SIGKILL", () => {
    console.log("SIGKILL");
    closeServer(server);
  });
};
